import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Canonical app schema, shared with the Supabase CLI and the pg-mem test harness.
 * Single source of truth: supabase/migrations/0001_initial_schema.sql.
 */
const CANONICAL_SCHEMA_PATH = path.join(
  __dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "0001_initial_schema.sql",
);

/**
 * SSL configuration.
 * - Supabase (and most managed Postgres) require TLS. The pooler presents a cert that does not
 *   match the default CA chain pg expects, so we accept it without strict verification.
 * - Local Docker Postgres does not speak TLS; set `PGSSL=disable` to turn SSL off entirely.
 *
 * DATABASE_URL for Supabase uses the Supavisor session pooler (port 5432), e.g.:
 *   postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
 * Session mode (5432) preserves per-connection / prepared-statement behaviour for the long-lived
 * pool below and provides IPv4 connectivity (unlike the IPv6-only direct db host).
 */
const ssl =
  process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  ssl,
});

export async function initSchema(): Promise<void> {
  if (process.env.APPLY_SCHEMA !== "true") return;
  const sql = fs.readFileSync(CANONICAL_SCHEMA_PATH, "utf8");
  await pool.query(sql);
  console.log("Applied supabase/migrations/0001_initial_schema.sql");
}
