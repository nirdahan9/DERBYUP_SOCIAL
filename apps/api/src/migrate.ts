import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
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
  await ensureMigrationTable();

  const migrationDir = resolve(process.cwd(), "db/migrations");
  const migrationFiles = (await readdir(migrationDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const filename of migrationFiles) {
    await applyMigration(migrationDir, filename);
  }
} finally {
  await pool.end();
}

async function ensureMigrationTable(): Promise<void> {
  await pool.query(`
    create table if not exists schema_migrations (
      id text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
}

async function applyMigration(migrationDir: string, filename: string): Promise<void> {
  const id = filename.replace(/\.sql$/, "");
  const migrationPath = resolve(migrationDir, filename);
  const sql = await readFile(migrationPath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");

  const existing = await pool.query<{ checksum: string }>("select checksum from schema_migrations where id = $1", [id]);
  if (existing.rows[0]) {
    if (existing.rows[0].checksum !== checksum) {
      throw new Error(`Migration ${filename} was already applied with a different checksum.`);
    }
    console.log(`Migration ${filename} already applied.`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into schema_migrations (id, checksum) values ($1, $2)", [id, checksum]);
    await client.query("commit");
    console.log(`Migration ${filename} applied.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
