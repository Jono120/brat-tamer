import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

export async function initSchema(): Promise<void> {
  if (process.env.APPLY_SCHEMA !== "true") return;
  const schemaPath = path.join(__dirname, "..", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
  console.log("Applied server/schema.sql");
}
