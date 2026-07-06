import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createPgMemPoolFromSchema } from "../test/createPgMemPool.js";
import type pg from "pg";
import {
  isFriend,
  validateInteraction,
  validateTaskForLog,
  canAccessGroup,
  inviteAlreadyUsed,
  validatePhotoUrl,
} from "./authz.js";

describe("authz helpers", () => {
  let pool: pg.Pool;
  let userA: string;
  let userB: string;
  let userC: string;
  let globalTaskId: string;
  let privateTaskId: string;

  beforeAll(async () => {
    pool = await createPgMemPoolFromSchema();

    const insA = await pool.query(
      `INSERT INTO users (email, display_name, role, theme, has_completed_onboarding)
       VALUES ('a@test.com', 'A', 'user', 'light', true) RETURNING id`,
    );
    userA = String(insA.rows[0].id);

    const insB = await pool.query(
      `INSERT INTO users (email, display_name, role, theme, has_completed_onboarding)
       VALUES ('b@test.com', 'B', 'user', 'light', true) RETURNING id`,
    );
    userB = String(insB.rows[0].id);

    const insC = await pool.query(
      `INSERT INTO users (email, display_name, role, theme, has_completed_onboarding)
       VALUES ('c@test.com', 'C', 'user', 'light', true) RETURNING id`,
    );
    userC = String(insC.rows[0].id);

    await pool.query(
      `INSERT INTO user_friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)`,
      [userA, userB],
    );

    const gt = await pool.query(
      `INSERT INTO tasks (user_id, title, icon, frequency, created_at, is_global, is_daily_challenge)
       VALUES ($1, 'Global', 'star', 'daily', NOW(), true, false) RETURNING id`,
      [userA],
    );
    globalTaskId = String(gt.rows[0].id);

    const pt = await pool.query(
      `INSERT INTO tasks (user_id, title, icon, frequency, created_at, is_global, is_daily_challenge)
       VALUES ($1, 'Private', 'star', 'daily', NOW(), false, false) RETURNING id`,
      [userC],
    );
    privateTaskId = String(pt.rows[0].id);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("isFriend returns true for friends only", async () => {
    expect(await isFriend(pool, userA, userB)).toBe(true);
    expect(await isFriend(pool, userA, userC)).toBe(false);
    expect(await isFriend(pool, userA, userA)).toBe(false);
  });

  it("validateInteraction rejects self and non-friends", async () => {
    expect(await validateInteraction(pool, userA, userA, "high-five")).toMatchObject({
      status: 400,
    });
    expect(await validateInteraction(pool, userA, userC, "high-five")).toMatchObject({
      status: 403,
    });
    expect(await validateInteraction(pool, userA, userB, "high-five")).toBeNull();
    expect(await validateInteraction(pool, userA, userB, "invalid")).toMatchObject({
      status: 400,
    });
  });

  it("validateTaskForLog allows global tasks and owned tasks", async () => {
    expect(await validateTaskForLog(pool, userA, globalTaskId)).toBeNull();
    expect(await validateTaskForLog(pool, userA, privateTaskId)).toMatchObject({
      status: 403,
    });
    expect(await validateTaskForLog(pool, userC, privateTaskId)).toBeNull();
    expect(await validateTaskForLog(pool, userA, "00000000-0000-4000-8000-000000009999")).toMatchObject({
      status: 400,
    });
  });

  it("canAccessGroup checks admin and members", () => {
    const group = { admin_id: userA, members: [userA, userB] };
    expect(canAccessGroup(userA, group)).toBe(true);
    expect(canAccessGroup(userB, group)).toBe(true);
    expect(canAccessGroup(userC, group)).toBe(false);
  });

  it("inviteAlreadyUsed rejects used invites", () => {
    expect(inviteAlreadyUsed({ used: true })).toMatchObject({ status: 410 });
    expect(inviteAlreadyUsed({ used: false })).toBeNull();
  });

  it("validatePhotoUrl rejects data URLs", () => {
    expect(validatePhotoUrl("data:image/png;base64,abc")).toMatchObject({
      status: 400,
    });
    expect(validatePhotoUrl("avatars/u1/photo.png")).toBeNull();
    expect(validatePhotoUrl("https://example.com/a.png")).toBeNull();
  });
});
