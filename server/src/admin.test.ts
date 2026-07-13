import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdminEmail, syncAdminRole } from "./admin.js";
import { createPgMemPoolFromSchema } from "../test/createPgMemPool.js";
import type pg from "pg";

describe("admin", () => {
  let pool: pg.Pool;
  let userId: string;

  beforeEach(async () => {
    pool = await createPgMemPoolFromSchema();
    const ins = await pool.query(
      `INSERT INTO users (email, display_name, role, theme, has_completed_onboarding)
       VALUES ('admin@test.com', 'Admin', 'user', 'light', false)
       RETURNING id`,
    );
    userId = String(ins.rows[0].id);
  });

  afterEach(async () => {
    await pool.end();
  });

  it("isAdminEmail reads ADMIN_EMAILS env", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail("admin@test.com")).toBe(true);
    expect(isAdminEmail("other@test.com")).toBe(false);
  });

  it("syncAdminRole promotes and demotes from env list", async () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    await syncAdminRole(pool, userId, "admin@test.com");
    let r = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
    expect(r.rows[0].role).toBe("admin");

    process.env.ADMIN_EMAILS = "";
    await syncAdminRole(pool, userId, "admin@test.com");
    r = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
    expect(r.rows[0].role).toBe("user");
  });
});
