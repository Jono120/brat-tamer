import "dotenv/config";
import bcrypt from "bcrypt";
import cors from "cors";
import express from "express";
import session from "express-session";
import jwt from "jsonwebtoken";
import * as jose from "jose";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { buildAllowedCorsOrigins } from "./corsConfig.js";
import { initSchema, pool } from "./db.js";
import {
  mapGroupRow,
  mapInteractionRow,
  mapLogRow,
  mapTaskRow,
  mapUserRow,
} from "./mappers.js";

type TaskPayload = {
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  isGlobal?: boolean;
  isDailyChallenge?: boolean;
  description?: string;
  targetCount?: number;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PORT = Number(process.env.PORT) || 3001;
const SALT_ROUNDS = 10;

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}

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

function jwtAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!JWT_SECRET) {
    res.status(500).json({ error: "JWT_SECRET not configured" });
    return;
  }
  try {
    const p = jwt.verify(h.slice(7), JWT_SECRET) as {
      sub: string;
      email: string;
    };
    (req as express.Request & { userId: string; userEmail: string }).userId =
      p.sub;
    (req as express.Request & { userId: string; userEmail: string }).userEmail =
      p.email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const uid = (req as express.Request & { userId: string }).userId;
  const r = await pool.query("SELECT email, role FROM users WHERE id = $1", [
    uid,
  ]);
  if (r.rows.length === 0) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const row = r.rows[0];
  if (row.role === "admin" || isAdminEmail(String(row.email))) {
    next();
    return;
  }
  res.status(403).json({ error: "Forbidden" });
}

async function main() {
  if (!JWT_SECRET) {
    console.warn("Warning: JWT_SECRET is not set.");
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  await initSchema();

  const app = express();
  const allowedCorsOrigins = buildAllowedCorsOrigins();
  app.use(
    cors({
      origin: Array.from(allowedCorsOrigins),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "6mb" }));
  app.use(
    session({
      secret:
        process.env.SESSION_SECRET || JWT_SECRET || "carestickers-session",
      resave: false,
      saveUninitialized: false,
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id: string, done) => {
    try {
      const r = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
      done(null, r.rows[0] || null);
    } catch (e) {
      done(e, null);
    }
  });

  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleCallback =
    process.env.GOOGLE_CALLBACK_URL ||
    `http://localhost:${PORT}/api/auth/google/callback`;

  if (googleId && googleSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleId,
          clientSecret: googleSecret,
          callbackURL: googleCallback,
        },
        async (_access, _refresh, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const sub = profile.id;
            const displayName =
              profile.displayName || email?.split("@")[0] || "Friend";
            const photo = profile.photos?.[0]?.value || "";
            if (!email) {
              done(new Error("No email from Google"));
              return;
            }

            const byGoogle = await pool.query(
              "SELECT * FROM users WHERE google_sub = $1",
              [sub],
            );
            if (byGoogle.rows.length > 0) {
              done(null, { id: byGoogle.rows[0].id });
              return;
            }

            const byEmail = await pool.query(
              "SELECT * FROM users WHERE lower(email) = lower($1)",
              [email],
            );
            if (byEmail.rows.length > 0) {
              await pool.query(
                "UPDATE users SET google_sub = $1, photo_url = COALESCE(photo_url, $2), display_name = COALESCE(NULLIF(display_name, ''), $3) WHERE id = $4",
                [sub, photo, displayName, byEmail.rows[0].id],
              );
              done(null, { id: byEmail.rows[0].id });
              return;
            }

            const role = isAdminEmail(email) ? "admin" : "user";
            const ins = await pool.query(
              `INSERT INTO users (email, password_hash, display_name, photo_url, role, has_completed_onboarding, google_sub)
               VALUES ($1, NULL, $2, $3, $4, false, $5) RETURNING id`,
              [
                email,
                displayName,
                photo ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub}`,
                role,
                sub,
              ],
            );
            done(null, { id: ins.rows[0].id });
          } catch (e) {
            done(e as Error, undefined);
          }
        },
      ),
    );
  }

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  function signToken(userId: string, email: string) {
    if (!JWT_SECRET) throw new Error("JWT_SECRET");
    return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: "7d" });
  }

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body as {
        email?: string;
        password?: string;
      };
      if (!email || !password || password.length < 8) {
        res
          .status(400)
          .json({ error: "Valid email and password (8+ chars) required" });
        return;
      }
      const exists = await pool.query(
        "SELECT id FROM users WHERE lower(email) = lower($1)",
        [email],
      );
      if (exists.rows.length > 0) {
        res.status(409).json({ error: "Email already registered" });
        return;
      }
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      const role = isAdminEmail(email) ? "admin" : "user";
      const ins = await pool.query(
        `INSERT INTO users (email, password_hash, display_name, photo_url, role, has_completed_onboarding)
         VALUES ($1, $2, $3, $4, $5, false) RETURNING id, email`,
        [
          email,
          hash,
          email.split("@")[0],
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          role,
        ],
      );
      const row = ins.rows[0];
      const token = signToken(String(row.id), String(row.email));
      res.json({ token });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body as {
        email?: string;
        password?: string;
      };
      if (!email || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
      }
      const r = await pool.query(
        "SELECT * FROM users WHERE lower(email) = lower($1)",
        [email],
      );
      if (r.rows.length === 0 || !r.rows[0].password_hash) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const ok = await bcrypt.compare(
        password,
        String(r.rows[0].password_hash),
      );
      if (!ok) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const row = r.rows[0];
      const token = signToken(String(row.id), String(row.email));
      res.json({ token });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/apple", async (req, res) => {
    try {
      const { idToken } = req.body as { idToken?: string };
      const aud = process.env.APPLE_CLIENT_ID;
      if (!idToken || !aud) {
        res.status(400).json({ error: "idToken and APPLE_CLIENT_ID required" });
        return;
      }
      const JWKS = jose.createRemoteJWKSet(
        new URL("https://appleid.apple.com/auth/keys"),
      );
      const { payload } = await jose.jwtVerify(idToken, JWKS, {
        issuer: "https://appleid.apple.com",
        audience: aud,
      });
      const sub = String(payload.sub);
      const email = payload.email != null ? String(payload.email) : null;

      const byApple = await pool.query(
        "SELECT * FROM users WHERE apple_sub = $1",
        [sub],
      );
      if (byApple.rows.length > 0) {
        const row = byApple.rows[0];
        const token = signToken(String(row.id), String(row.email));
        res.json({ token });
        return;
      }

      if (email) {
        const byEmail = await pool.query(
          "SELECT * FROM users WHERE lower(email) = lower($1)",
          [email],
        );
        if (byEmail.rows.length > 0) {
          await pool.query("UPDATE users SET apple_sub = $1 WHERE id = $2", [
            sub,
            byEmail.rows[0].id,
          ]);
          const row = byEmail.rows[0];
          const token = signToken(String(row.id), String(row.email));
          res.json({ token });
          return;
        }
      }

      const fakeEmail =
        email || `apple-${sub.slice(0, 12)}@privaterelay.apple.local`;
      const role = email && isAdminEmail(email) ? "admin" : "user";
      const ins = await pool.query(
        `INSERT INTO users (email, password_hash, display_name, photo_url, role, has_completed_onboarding, apple_sub)
         VALUES ($1, NULL, $2, $3, $4, false, $5) RETURNING id, email`,
        [
          fakeEmail,
          "Friend",
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub}`,
          role,
          sub,
        ],
      );
      const row = ins.rows[0];
      const token = signToken(String(row.id), String(row.email));
      res.json({ token });
    } catch (e) {
      console.error(e);
      res.status(401).json({ error: "Apple sign-in failed" });
    }
  });

  if (googleId && googleSecret) {
    app.get(
      "/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] }),
    );
    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", {
        failureRedirect: `${FRONTEND_URL}/?error=google`,
      }),
      (req, res) => {
        const row = req.user as { id?: string; email?: string } | undefined;
        const id = row?.id != null ? String(row.id) : "";
        if (!id || !JWT_SECRET) {
          res.redirect(`${FRONTEND_URL}/?error=google`);
          return;
        }
        pool
          .query("SELECT email FROM users WHERE id = $1", [id])
          .then((r) => {
            const email = r.rows[0]?.email || row?.email || "";
            const token = signToken(id, String(email));
            res.redirect(`${FRONTEND_URL}/?token=${encodeURIComponent(token)}`);
          })
          .catch(() => res.redirect(`${FRONTEND_URL}/?error=google`));
      },
    );
  } else {
    app.get("/api/auth/google", (_req, res) => {
      res
        .status(501)
        .json({
          error:
            "Google OAuth is not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)",
        });
    });
  }

  app.get("/api/me", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
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
      res.json({
        user: {
          uid,
          email: row?.email ?? null,
          displayName: row?.display_name ?? null,
          photoURL: row?.photo_url ?? null,
        },
        profile,
      });
    } catch (e) {
      console.error(e);
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
        updates.push(`display_name = $${i++}`);
        vals.push(body.displayName);
      }
      if (body.photoURL != null) {
        updates.push(`photo_url = $${i++}`);
        vals.push(body.photoURL);
      }
      if (body.theme != null) {
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
      console.error(e);
      res.status(500).json({ error: "Update failed" });
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
      const admin = await pool.query(
        `SELECT role, email FROM users WHERE id = $1`,
        [uid],
      );
      const isAdm =
        admin.rows[0]?.role === "admin" ||
        isAdminEmail(String(admin.rows[0]?.email));
      const b = req.body as Partial<TaskPayload>;
      if (!b.title?.trim() || !b.icon) {
        res.status(400).json({ error: "title and icon required" });
        return;
      }
      const isGlobal = Boolean(b.isGlobal) && isAdm;
      const isDailyChallenge = Boolean(b.isDailyChallenge) && isAdm;
      const r = await pool.query(
        `INSERT INTO tasks (user_id, title, icon, frequency, created_at, is_global, is_daily_challenge, description, target_count)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8) RETURNING *`,
        [
          uid,
          b.title,
          b.icon,
          b.frequency || "daily",
          isGlobal,
          isDailyChallenge,
          b.description ?? "",
          b.targetCount ?? 1,
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
      const admin = await pool.query(
        `SELECT role, email FROM users WHERE id = $1`,
        [uid],
      );
      const isAdm =
        admin.rows[0]?.role === "admin" ||
        isAdminEmail(String(admin.rows[0]?.email));
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
        vals.push(b.description);
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
      const admin = await pool.query(
        `SELECT role, email FROM users WHERE id = $1`,
        [uid],
      );
      const isAdm =
        admin.rows[0]?.role === "admin" ||
        isAdminEmail(String(admin.rows[0]?.email));
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

  app.post("/api/logs", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const b = req.body as {
        taskId: string;
        date: string;
        earnedAt: string;
        count?: number;
      };
      const r = await pool.query(
        `INSERT INTO sticker_logs (user_id, task_id, date, earned_at, count) VALUES ($1, $2, $3::date, $4::timestamptz, $5) RETURNING *`,
        [uid, b.taskId, b.date, b.earnedAt, b.count ?? 1],
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
      const b = req.body as { count?: number; earnedAt?: string };
      const r = await pool.query("SELECT * FROM sticker_logs WHERE id = $1", [
        id,
      ]);
      if (r.rows.length === 0 || String(r.rows[0].user_id) !== uid) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await pool.query(
        `UPDATE sticker_logs SET count = COALESCE($1, count), earned_at = COALESCE($2::timestamptz, earned_at) WHERE id = $3`,
        [b.count ?? null, b.earnedAt ?? null, id],
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

  app.post("/api/interactions", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const b = req.body as {
        toUserId: string;
        type: string;
        content?: string;
        timestamp: string;
      };
      const r = await pool.query(
        `INSERT INTO interactions (from_user_id, to_user_id, type, content, timestamp, read) VALUES ($1, $2, $3, $4, $5::timestamptz, false) RETURNING *`,
        [uid, b.toUserId, b.type, b.content ?? null, b.timestamp],
      );
      res.json(mapInteractionRow(r.rows[0]));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to send interaction" });
    }
  });

  app.get("/api/groups/:id", jwtAuth, async (req, res) => {
    try {
      const r = await pool.query("SELECT * FROM groups WHERE id = $1", [
        req.params.id,
      ]);
      if (r.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
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
      const inviteCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
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

  app.post("/api/groups/join", jwtAuth, async (req, res) => {
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

  app.post("/api/invites", jwtAuth, async (req, res) => {
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

  app.get("/api/invites/:id", async (req, res) => {
    try {
      const r = await pool.query(
        "SELECT inviter_id FROM invites WHERE id = $1",
        [req.params.id],
      );
      if (r.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json({ inviterId: String(r.rows[0].inviter_id) });
    } catch (e) {
      console.error(e);
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

  app.post("/api/feedback", jwtAuth, async (req, res) => {
    try {
      const uid = (req as express.Request & { userId: string }).userId;
      const u = await pool.query("SELECT email FROM users WHERE id = $1", [
        uid,
      ]);
      const email = String(u.rows[0]?.email || "");
      const b = req.body as { content: string; type: string };
      await pool.query(
        `INSERT INTO feedback (user_id, user_email, content, type, timestamp, status) VALUES ($1, $2, $3, $4, NOW(), 'pending')`,
        [uid, email, b.content, b.type],
      );
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to submit feedback" });
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

  app.get("/api/admin/logs", jwtAuth, requireAdmin, async (_req, res) => {
    try {
      const r = await pool.query(
        "SELECT * FROM sticker_logs ORDER BY earned_at DESC LIMIT 50000",
      );
      res.json(r.rows.map(mapLogRow));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load logs" });
    }
  });

  const distPath = path.join(__dirname, "..", "..", "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, () => console.log(`API listening on ${PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
