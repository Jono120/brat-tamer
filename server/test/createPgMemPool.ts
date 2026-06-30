import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "node:crypto";
import { newDb } from "pg-mem";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * In-memory PostgreSQL (pg-mem) with the same schema as production, for integration-style tests.
 */
export async function createPgMemPoolFromSchema(): Promise<pg.Pool> {
  const db = newDb();

  db.registerExtension("pgcrypto", (schema) => {
    schema.registerFunction({
      name: "gen_random_uuid",
      returns: "uuid",
      impure: true,
      implementation: () => randomUUID(),
    });
  });

  // Load only the canonical app-table migration (0001). 0002_auth_link.sql references the
  // Supabase-managed `auth` schema, which pg-mem does not provide, so it is deliberately excluded.
  const schemaPath = path.join(
    __dirname,
    "..",
    "..",
    "supabase",
    "migrations",
    "0001_initial_schema.sql",
  );
  const sql = fs.readFileSync(schemaPath, "utf8");
  await db.public.many(sql);

  const { Pool } = db.adapters.createPg();
  return new Pool() as unknown as pg.Pool;
}
