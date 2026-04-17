import { describe, it, expect, afterAll } from "vitest";
import { createPgMemPoolFromSchema } from "../test/createPgMemPool.js";

/**
 * Uses pg-mem (in-memory Postgres). Some edge cases differ from real PostgreSQL;
 * we set `theme` explicitly because NULL theme tripped a CHECK in pg-mem for this schema.
 */
describe("PostgreSQL schema (pg-mem)", () => {
  let pool: Awaited<ReturnType<typeof createPgMemPoolFromSchema>>;

  afterAll(async () => {
    await pool?.end();
  });

  it("applies schema and supports inserts matching app expectations", async () => {
    pool = await createPgMemPoolFromSchema();

    const email = "test@example.com";
    const ins = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, photo_url, role, theme, has_completed_onboarding)
       VALUES ($1, $2, $3, NULL, $4, 'light', false) RETURNING id`,
      [email, "hash", "Tester", "user"],
    );
    const userId = ins.rows[0].id as string;

    const task = await pool.query(
      `INSERT INTO tasks (user_id, title, icon, frequency, created_at, is_global, is_daily_challenge, description, target_count)
       VALUES ($1, $2, $3, $4, NOW(), false, false, '', 1) RETURNING id`,
      [userId, "Water", "droplets", "daily"],
    );
    const taskId = task.rows[0].id as string;

    const log = await pool.query(
      `INSERT INTO sticker_logs (user_id, task_id, date, earned_at, count)
       VALUES ($1, $2, $3::date, NOW(), 1) RETURNING id`,
      [userId, taskId, "2026-01-15"],
    );

    expect(log.rows[0].id).toBeDefined();

    const count = await pool.query(
      `SELECT COUNT(*)::int AS c FROM users WHERE email = $1`,
      [email],
    );
    expect(count.rows[0].c).toBe(1);
  });
});
