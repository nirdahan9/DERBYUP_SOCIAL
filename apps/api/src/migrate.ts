import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

try {
  const migrationPath = resolve(process.cwd(), "db/migrations/001_initial.sql");
  const sql = await readFile(migrationPath, "utf8");
  await pool.query(sql);
  console.log("Migration 001_initial.sql applied.");
} finally {
  await pool.end();
}
