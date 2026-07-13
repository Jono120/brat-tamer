import "./env.js";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { resolvePhotoUrl } from "./avatarUrl.js";
import { userIsAdmin, isAdminEmail, syncAdminRole } from "./admin.js";
import {
  canAccessGroup,
  generateGroupInviteCode,
  inviteAlreadyUsed,
  validateInteraction,
  validatePhotoUrl,
  validateTaskForLog,
} from "./authz.js";
import { buildAllowedCorsOrigins } from "./corsConfig.js";
import { initSchema, pool } from "./db.js";
import { logRequestError } from "./logger.js";
import {
  mapFeedbackRow,
  mapGroupRow,
  mapInteractionRow,
  mapLogRow,
  mapTaskRow,
  mapUserRow,
} from "./mappers.js";
import { sendPushToUser, validatePushRegistration } from "./push.js";
import { apiLimiter, joinLimiter, writeLimiter } from "./rateLimit.js";
import { jwtAuth, warnIfSupabaseAuthMissing } from "./supabaseServer.js";
import {
  clampTaskDescription,
  normalizeLogNote,
  validateDisplayName,
  validateFeedback,
  validateTaskPayload,
  validateTheme,
} from "./validation.js";

type TaskPayload = {
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  isGlobal?: boolean;
  isDailyChallenge?: boolean;
  description?: string;
  targetCount?: number;
  requiresNote?: boolean;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3001;

async function getFriendIds(userId: string): Promise<string[]> {
  const r = await pool.query(
    "SELECT friend_id FROM user_friends WHERE user_id = $1",
    [userId],
  );
  return r.rows.map((row) => String(row.friend_id));
}

async function loadProfile(userId: string) {
  const u = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  if (u.rows.length === 0) return null;
  const friends = await getFriendIds(userId);
  return mapUserRow(u.rows[0], friends);
}

/**
 * Ensure a public.users profile row exists for the authenticated Supabase user.
 * On Supabase the `handle_new_user` trigger creates this row automatically, but this is a safe
 * net for the first request after sign-up (and for local Postgres setups without the trigger).
 */
async function ensureUserRow(
  userId: string,
  email: string | null | undefined,
): Promise<void> {
  const existing = await pool.query("SELECT id FROM users WHERE id = $1", [
    userId,
  ]);
  if (existing.rows.length > 0) {
    await syncAdminRole(pool, userId, email);
    return;
  }
  const safeEmail = email || `user-${userId}@no-email.local`;
  const role = isAdminEmail(safeEmail) ? "admin" : "user";
  await pool.query(
    `INSERT INTO users (id, email, display_name, photo_url, role, has_completed_onboarding)
     VALUES ($1, $2, $3, $4, $5, false)
     ON CONFLICT (id) DO NOTHING`,
    [
      userId,
      safeEmail,
      safeEmail.split("@")[0] || "Friend",
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      role,
    ],
  );
}

async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const uid = req.userId!;
  const isAdmin = await userIsAdmin(pool, uid);
  if (!isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

async function main() {
  warnIfSupabaseAuthMissing();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  await initSchema();

  const app = express();
  if (process.env.NODE_ENV !== "test") {
    app.set("trust proxy", 1);
  }
  const allowedCorsOrigins = buildAllowedCorsOrigins();
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: Array.from(allowedCorsOrigins),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", apiLimiter);

  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true, db: true });
    } catch (e) {
      logRequestError(e, { path: "/api/health" }, 503);
      res.status(503).json({ ok: false, db: false });
    }
  });

  app.get("/api/me", jwtAuth, async (req, res) => {
    try {
      const r = req as express.Request & { userId: string; userEmail: string };
      const uid = r.userId;
      // Safety net: provision the profile row if the Supabase trigger has not yet run.
      await ensureUserRow(uid, r.userEmail);
      const profile = await loadProfile(uid);
      if (!profile) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const u = await pool.query(
        "SELECT email, photo_url, display_name FROM users WHERE id = $1",
        [uid],
      );
      const row = u.rows[0];
      const photoURL = await resolvePhotoUrl(
        row?.photo_url != null ? String(row.photo_url) : null,
      );
      res.json({
        user: {
          uid,
          email: row?.email ?? null,
          displayName: row?.display_name ?? null,
          photoURL,
        },
        profile: { ...profile, photoURL },
      });
    } catch (e) {
      logRequestError(e, { path: "/api/me", userId: req.userId }, 500);
      res.status(500).json({ error: "Failed to load profile" });
    }
  });

  app.patch("/api/profile", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const body = req.body as Partial<{
        displayName: string;
        photoURL: string;
        theme: string;
        hasCompletedOnboarding: boolean;
      }>;
      const updates: string[] = [];
      const vals: unknown[] = [];
      let i = 1;
      if (body.displayName != null) {
        const nameErr = validateDisplayName(body.displayName);
        if (nameErr) {
          res.status(nameErr.status).json({ error: nameErr.error });
          return;
        }
        updates.push(`display_name = $${i++}`);
        vals.push(body.displayName.trim());
      }
      if (body.photoURL != null) {
        const photoErr = validatePhotoUrl(body.photoURL);
        if (photoErr) {
          res.status(photoErr.status).json({ error: photoErr.error });
          return;
        }
        updates.push(`photo_url = $${i++}`);
        vals.push(body.photoURL);
      }
      if (body.theme != null) {
        const themeErr = validateTheme(body.theme);
        if (themeErr) {
          res.status(themeErr.status).json({ error: themeErr.error });
          return;
        }
        updates.push(`theme = $${i++}`);
        vals.push(body.theme);
      }
      if (body.hasCompletedOnboarding != null) {
        updates.push(`has_completed_onboarding = $${i++}`);
        vals.push(body.hasCompletedOnboarding);
      }
      if (updates.length === 0) {
        res.json({ ok: true });
        return;
      }
      vals.push(uid);
      await pool.query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = $${i}`,
        vals,
      );
      const profile = await loadProfile(uid);
      res.json({ profile });
    } catch (e) {
      logRequestError(e, { path: "/api/profile", userId: req.userId }, 500);
      res.status(500).json({ error: "Update failed" });
    }
  });

  app.get("/api/friends", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const today = new Date().toISOString().split("T")[0];
      const r = await pool.query(
        `SELECT u.id, u.display_name, u.photo_url,
           COALESCE((
             SELECT SUM(sl.count)::int FROM sticker_logs sl
             WHERE sl.user_id = u.id AND sl.date = $2::date
           ), 0) AS today_sticker_count
         FROM user_friends uf
         JOIN users u ON u.id = uf.friend_id
         WHERE uf.user_id = $1
         ORDER BY u.display_name`,
        [uid, today],
      );
      const friends = await Promise.all(
        r.rows.map(async (row) => ({
          uid: String(row.id),
          displayName: String(row.display_name),
          photoURL: await resolvePhotoUrl(
            row.photo_url != null ? String(row.photo_url) : null,
          ),
          todayStickerCount: Number(row.today_sticker_count) || 0,
        })),
      );
      res.json(friends);
    } catch (e) {
      logRequestError(e, { path: "/api/friends", userId: req.userId }, 500);
      res.status(500).json({ error: "Failed to load friends" });
    }
  });

  app.get("/api/tasks/mine", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const r = await pool.query(
        `SELECT * FROM tasks WHERE user_id = $1 AND is_global = false ORDER BY created_at DESC`,
        [uid],
      );
      res.json(r.rows.map(mapTaskRow));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load tasks" });
    }
  });

  app.get("/api/tasks/global", jwtAuth, async (_req, res) => {
    try {
      const r = await pool.query(
        `SELECT * FROM tasks WHERE is_global = true ORDER BY created_at DESC`,
      );
      res.json(r.rows.map(mapTaskRow));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load global tasks" });
    }
  });

  app.post("/api/tasks", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const isAdm = await userIsAdmin(pool, uid);
      const b = req.body as Partial<TaskPayload>;
      const payloadErr = validateTaskPayload(b.title, b.icon);
      if (payloadErr) {
        res.status(payloadErr.status).json({ error: payloadErr.error });
        return;
      }
      const isGlobal = Boolean(b.isGlobal) && isAdm;
      const isDailyChallenge = Boolean(b.isDailyChallenge) && isAdm;
      const requiresNote = Boolean(b.requiresNote) && isAdm;
      const r = await pool.query(
        `INSERT INTO tasks (user_id, title, icon, frequency, created_at, is_global, is_daily_challenge, description, target_count, requires_note)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9) RETURNING *`,
        [
          uid,
          b.title!.trim(),
          b.icon!.trim(),
          b.frequency || "daily",
          isGlobal,
          isDailyChallenge,
          clampTaskDescription(b.description ?? ""),
          b.targetCount ?? 1,
          requiresNote,
        ],
      );
      res.json(mapTaskRow(r.rows[0]));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const id = req.params.id;
      const t = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
      if (t.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const task = t.rows[0];
      const isAdm = await userIsAdmin(pool, uid);
      const owner = String(task.user_id) === uid;
      if (!owner && !isAdm) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (task.is_global && !isAdm) {
        res.status(403).json({ error: "Only admins can edit global tasks" });
        return;
      }
      const b = req.body as Partial<TaskPayload>;
      const sets: string[] = [];
      const vals: unknown[] = [];
      let n = 1;
      if (b.title !== undefined) {
        sets.push(`title = $${n++}`);
        vals.push(b.title);
      }
      if (b.icon !== undefined) {
        sets.push(`icon = $${n++}`);
        vals.push(b.icon);
      }
      if (b.frequency !== undefined) {
        sets.push(`frequency = $${n++}`);
        vals.push(b.frequency);
      }
      if (b.description !== undefined) {
        sets.push(`description = $${n++}`);
        vals.push(clampTaskDescription(b.description));
      }
      if (b.targetCount !== undefined) {
        sets.push(`target_count = $${n++}`);
        vals.push(b.targetCount);
      }
      if (b.isGlobal !== undefined && isAdm) {
        sets.push(`is_global = $${n++}`);
        vals.push(Boolean(b.isGlobal));
      }
      if (b.isDailyChallenge !== undefined && isAdm) {
        sets.push(`is_daily_challenge = $${n++}`);
        vals.push(Boolean(b.isDailyChallenge));
      }
      if (b.requiresNote !== undefined && isAdm) {
        sets.push(`requires_note = $${n++}`);
        vals.push(Boolean(b.requiresNote));
      }
      if (sets.length === 0) {
        const cur = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
        res.json(mapTaskRow(cur.rows[0]));
        return;
      }
      vals.push(id);
      await pool.query(
        `UPDATE tasks SET ${sets.join(", ")} WHERE id = $${n}`,
        vals,
      );
      const u = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
      res.json(mapTaskRow(u.rows[0]));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const id = req.params.id;
      const t = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
      if (t.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const task = t.rows[0];
      const isAdm = await userIsAdmin(pool, uid);
      const owner = String(task.user_id) === uid;
      if (!owner && !isAdm) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (task.is_global && !isAdm) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.get("/api/logs/mine", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const date = req.query.date as string | undefined;
      if (date) {
        const r = await pool.query(
          `SELECT * FROM sticker_logs WHERE user_id = $1 AND date = $2::date`,
          [uid, date],
        );
        res.json(r.rows.map(mapLogRow));
      } else {
        const r = await pool.query(
          `SELECT * FROM sticker_logs WHERE user_id = $1 ORDER BY date DESC`,
          [uid],
        );
        res.json(r.rows.map(mapLogRow));
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load logs" });
    }
  });

  app.post("/api/logs", jwtAuth, writeLimiter, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const b = req.body as {
        taskId: string;
        date: string;
        earnedAt: string;
        count?: number;
        note?: string;
      };
      const taskErr = await validateTaskForLog(pool, uid, b.taskId);
      if (taskErr) {
        res.status(taskErr.status).json({ error: taskErr.error });
        return;
      }
      const note = normalizeLogNote(b.note);
      const r = await pool.query(
        `INSERT INTO sticker_logs (user_id, task_id, date, earned_at, count, note) VALUES ($1, $2, $3::date, $4::timestamptz, $5, $6) RETURNING *`,
        [uid, b.taskId, b.date, b.earnedAt, b.count ?? 1, note],
      );
      res.json(mapLogRow(r.rows[0]));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create log" });
    }
  });

  app.patch("/api/logs/:id", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const id = req.params.id;
      const b = req.body as { count?: number; earnedAt?: string; note?: string };
      const r = await pool.query("SELECT * FROM sticker_logs WHERE id = $1", [
        id,
      ]);
      if (r.rows.length === 0 || String(r.rows[0].user_id) !== uid) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const note = normalizeLogNote(b.note);
      await pool.query(
        `UPDATE sticker_logs SET count = COALESCE($1, count), earned_at = COALESCE($2::timestamptz, earned_at), note = COALESCE($3, note) WHERE id = $4`,
        [b.count ?? null, b.earnedAt ?? null, note, id],
      );
      const u = await pool.query("SELECT * FROM sticker_logs WHERE id = $1", [
        id,
      ]);
      res.json(mapLogRow(u.rows[0]));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update log" });
    }
  });

  app.delete("/api/logs/:id", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const id = req.params.id;
      const r = await pool.query(
        "DELETE FROM sticker_logs WHERE id = $1 AND user_id = $2 RETURNING id",
        [id, uid],
      );
      if (r.rows.length === 0) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete log" });
    }
  });

  app.get("/api/interactions/inbox", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const r = await pool.query(
        `SELECT * FROM interactions WHERE to_user_id = $1 ORDER BY timestamp DESC`,
        [uid],
      );
      res.json(r.rows.map(mapInteractionRow));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load interactions" });
    }
  });

  app.post("/api/interactions", jwtAuth, writeLimiter, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const b = req.body as {
        toUserId: string;
        type: string;
        content?: string;
        timestamp: string;
      };
      const authzErr = await validateInteraction(pool, uid, b.toUserId, b.type);
      if (authzErr) {
        res.status(authzErr.status).json({ error: authzErr.error });
        return;
      }
      const r = await pool.query(
        `INSERT INTO interactions (from_user_id, to_user_id, type, content, timestamp, read) VALUES ($1, $2, $3, $4, $5::timestamptz, false) RETURNING *`,
        [uid, b.toUserId, b.type, b.content ?? null, b.timestamp],
      );
      // Fire-and-forget: never block or fail the interaction on push delivery.
      sendPushToUser(pool, b.toUserId, {
        title: "New Interaction! \u{1F31F}",
        body: `Someone sent you a ${b.type}!`,
        url: "/social",
      }).catch((err) => console.error("Push send failed:", err));
      res.json(mapInteractionRow(r.rows[0]));
    } catch (e) {
      logRequestError(e, { path: "/api/interactions", userId: req.userId }, 500);
      res.status(500).json({ error: "Failed to send interaction" });
    }
  });

  app.patch("/api/interactions/:id/read", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const r = await pool.query(
        `UPDATE interactions SET read = true
         WHERE id = $1 AND to_user_id = $2
         RETURNING *`,
        [req.params.id, uid],
      );
      if (r.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(mapInteractionRow(r.rows[0]));
    } catch (e) {
      logRequestError(
        e,
        { path: "/api/interactions/:id/read", userId: req.userId },
        500,
      );
      res.status(500).json({ error: "Failed to mark read" });
    }
  });

  app.post("/api/interactions/inbox/mark-read", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      await pool.query(
        `UPDATE interactions SET read = true WHERE to_user_id = $1 AND read = false`,
        [uid],
      );
      res.json({ ok: true });
    } catch (e) {
      logRequestError(
        e,
        { path: "/api/interactions/inbox/mark-read", userId: req.userId },
        500,
      );
      res.status(500).json({ error: "Failed to mark inbox read" });
    }
  });

  app.get("/api/groups/:id", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const r = await pool.query("SELECT * FROM groups WHERE id = $1", [
        req.params.id,
      ]);
      if (r.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (!canAccessGroup(uid, r.rows[0])) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      res.json(mapGroupRow(r.rows[0]));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load group" });
    }
  });

  app.post("/api/groups", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const { name } = req.body as { name?: string };
      if (!name?.trim()) {
        res.status(400).json({ error: "Name required" });
        return;
      }
      const inviteCode = generateGroupInviteCode();
      const ins = await pool.query(
        `INSERT INTO groups (name, admin_id, members, invite_code, created_at)
         VALUES ($1, $2, ARRAY[$3::uuid], $4, NOW()) RETURNING *`,
        [name.trim(), uid, uid, inviteCode],
      );
      await pool.query(
        `UPDATE users SET group_id = $1, role = 'group-admin' WHERE id = $2`,
        [ins.rows[0].id, uid],
      );
      res.json(mapGroupRow(ins.rows[0]));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.post("/api/groups/join", jwtAuth, joinLimiter, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const { code } = req.body as { code?: string };
      if (!code) {
        res.status(400).json({ error: "code required" });
        return;
      }
      const r = await pool.query(
        `SELECT * FROM groups WHERE invite_code = $1`,
        [code.toUpperCase()],
      );
      if (r.rows.length === 0) {
        res.status(404).json({ error: "Invalid code" });
        return;
      }
      const g = r.rows[0];
      const members = (g.members as string[]) || [];
      if (members.map(String).includes(uid)) {
        res.json({ alreadyMember: true, group: mapGroupRow(g) });
        return;
      }
      await pool.query(
        `UPDATE groups SET members = array_append(members, $1::uuid) WHERE id = $2`,
        [uid, g.id],
      );
      await pool.query(`UPDATE users SET group_id = $1 WHERE id = $2`, [
        g.id,
        uid,
      ]);
      const u = await pool.query("SELECT * FROM groups WHERE id = $1", [g.id]);
      res.json({ group: mapGroupRow(u.rows[0]) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to join group" });
    }
  });

  app.post("/api/invites", jwtAuth, writeLimiter, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const r = await pool.query(
        `INSERT INTO invites (inviter_id, created_at, used) VALUES ($1, NOW(), false) RETURNING id`,
        [uid],
      );
      res.json({ id: String(r.rows[0].id) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  app.get("/api/invites/:id", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const r = await pool.query(
        "SELECT inviter_id, used FROM invites WHERE id = $1",
        [req.params.id],
      );
      if (r.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const row = r.rows[0];
      const inviterId = String(row.inviter_id);
      const isInviter = inviterId === uid;
      if (row.used) {
        res.json({
          valid: false,
          used: true,
          ...(isInviter ? { inviterId } : {}),
        });
        return;
      }
      res.json({
        valid: true,
        inviterId,
      });
    } catch (e) {
      logRequestError(e, { path: "/api/invites/:id", userId: req.userId }, 500);
      res.status(500).json({ error: "Failed to load invite" });
    }
  });

  app.post("/api/invites/:id/accept", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const inviteId = req.params.id;
      const inv = await pool.query("SELECT * FROM invites WHERE id = $1", [
        inviteId,
      ]);
      if (inv.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const usedErr = inviteAlreadyUsed(inv.rows[0]);
      if (usedErr) {
        res.status(usedErr.status).json({ error: usedErr.error });
        return;
      }
      const inviterId = String(inv.rows[0].inviter_id);
      if (inviterId === uid) {
        res.json({ ok: true, skipped: true });
        return;
      }
      const ins = `INSERT INTO user_friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`;
      await pool.query(ins, [uid, inviterId]);
      await pool.query(ins, [inviterId, uid]);
      await pool.query(`UPDATE invites SET used = true WHERE id = $1`, [
        inviteId,
      ]);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });

  app.post("/api/feedback", jwtAuth, writeLimiter, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const u = await pool.query("SELECT email FROM users WHERE id = $1", [
        uid,
      ]);
      const email = String(u.rows[0]?.email || "");
      const b = req.body as { content: string; type: string };
      const feedbackErr = validateFeedback(b.content, b.type);
      if (feedbackErr) {
        res.status(feedbackErr.status).json({ error: feedbackErr.error });
        return;
      }
      await pool.query(
        `INSERT INTO feedback (user_id, user_email, content, type, timestamp, status) VALUES ($1, $2, $3, $4, NOW(), 'pending')`,
        [uid, email, b.content.trim(), b.type],
      );
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.post("/api/push/register", jwtAuth, writeLimiter, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const b = req.body as { token?: unknown; platform?: unknown };
      const err = validatePushRegistration(b.token, b.platform);
      if (err) {
        res.status(err.status).json({ error: err.error });
        return;
      }
      // A token belongs to a device; if another account signs in on the same
      // device, reassign the token to the new user.
      await pool.query(
        `INSERT INTO push_tokens (user_id, platform, token)
         VALUES ($1, $2, $3)
         ON CONFLICT (token) DO UPDATE
           SET user_id = EXCLUDED.user_id,
               platform = EXCLUDED.platform,
               updated_at = NOW()`,
        [uid, b.platform, b.token],
      );
      res.json({ ok: true });
    } catch (e) {
      logRequestError(e, { path: "/api/push/register", userId: req.userId }, 500);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  app.delete("/api/push/register", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const b = req.body as { token?: unknown };
      if (typeof b.token !== "string" || !b.token.trim()) {
        res.status(400).json({ error: "token is required" });
        return;
      }
      await pool.query(
        "DELETE FROM push_tokens WHERE token = $1 AND user_id = $2",
        [b.token, uid],
      );
      res.json({ ok: true });
    } catch (e) {
      logRequestError(e, { path: "/api/push/register", userId: req.userId }, 500);
      res.status(500).json({ error: "Failed to remove push token" });
    }
  });

  app.get("/api/admin/users", jwtAuth, requireAdmin, async (_req, res) => {
    try {
      const r = await pool.query("SELECT * FROM users ORDER BY created_at");
      const out = [];
      for (const row of r.rows) {
        const friends = await getFriendIds(String(row.id));
        out.push(mapUserRow(row, friends));
      }
      res.json(out);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load users" });
    }
  });

  app.get("/api/admin/logs", jwtAuth, requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(
        Math.max(Number(req.query.limit) || 500, 1),
        2000,
      );
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const r = await pool.query(
        "SELECT * FROM sticker_logs ORDER BY earned_at DESC LIMIT $1 OFFSET $2",
        [limit, offset],
      );
      res.json({
        logs: r.rows.map(mapLogRow),
        limit,
        offset,
        hasMore: r.rows.length === limit,
      });
    } catch (e) {
      logRequestError(e, { path: "/api/admin/logs", userId: req.userId }, 500);
      res.status(500).json({ error: "Failed to load logs" });
    }
  });

  app.get("/api/admin/feedback", jwtAuth, requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const r = await pool.query(
        `SELECT * FROM feedback WHERE status = 'pending'
         ORDER BY timestamp DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      res.json({
        feedback: r.rows.map(mapFeedbackRow),
        limit,
        offset,
        hasMore: r.rows.length === limit,
      });
    } catch (e) {
      logRequestError(
        e,
        { path: "/api/admin/feedback", userId: req.userId },
        500,
      );
      res.status(500).json({ error: "Failed to load feedback" });
    }
  });

  app.patch("/api/admin/feedback/:id", jwtAuth, requireAdmin, async (req, res) => {
    try {
      const r = await pool.query(
        `UPDATE feedback SET status = 'reviewed' WHERE id = $1 RETURNING *`,
        [req.params.id],
      );
      if (r.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(mapFeedbackRow(r.rows[0]));
    } catch (e) {
      logRequestError(
        e,
        { path: "/api/admin/feedback/:id", userId: req.userId },
        500,
      );
      res.status(500).json({ error: "Failed to update feedback" });
    }
  });

  app.post(
    "/api/admin/tasks/:id/daily-challenge",
    jwtAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const id = req.params.id;
        const t = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
        if (t.rows.length === 0) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        if (!t.rows[0].is_global) {
          res.status(400).json({ error: "Daily challenge must be a global task" });
          return;
        }
        await pool.query("SELECT public.set_daily_challenge($1)", [id]);
        const u = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
        res.json(mapTaskRow(u.rows[0]));
      } catch (e) {
        logRequestError(
          e,
          { path: "/api/admin/tasks/:id/daily-challenge", userId: req.userId },
          500,
        );
        res.status(500).json({ error: "Failed to set daily challenge" });
      }
    },
  );

  const distPath = path.join(__dirname, "..", "..", "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, () => console.log(`API listening on ${PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
