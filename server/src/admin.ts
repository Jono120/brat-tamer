import type pg from "pg";

/** Comma-separated admin emails from ADMIN_EMAILS (single source of truth). */
export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}

/**
 * Keeps users.role aligned with ADMIN_EMAILS. Env list is authoritative for admin;
 * group-admin is never changed here.
 */
export async function syncAdminRole(
  pool: pg.Pool,
  userId: string,
  email: string | null | undefined,
): Promise<void> {
  const shouldBeAdmin = isAdminEmail(email);
  if (shouldBeAdmin) {
    await pool.query(
      `UPDATE users SET role = 'admin' WHERE id = $1 AND role IN ('user', 'admin')`,
      [userId],
    );
    return;
  }
  await pool.query(
    `UPDATE users SET role = 'user' WHERE id = $1 AND role = 'admin'`,
    [userId],
  );
}

/** Admin check: ADMIN_EMAILS env list (synced to DB role on each call). */
export async function userIsAdmin(
  pool: pg.Pool,
  userId: string,
): Promise<boolean> {
  const r = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
  if (r.rows.length === 0) return false;
  const email = String(r.rows[0].email ?? "");
  await syncAdminRole(pool, userId, email);
  return isAdminEmail(email);
}
