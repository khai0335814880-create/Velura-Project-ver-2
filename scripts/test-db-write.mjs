import pg from "pg";
import { randomUUID } from "node:crypto";
import { SCRIPT_CONFIG } from "./config.mjs";

const { Client } = pg;

if (!SCRIPT_CONFIG.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is required");
}

const client = new Client({
  connectionString: SCRIPT_CONFIG.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  statement_timeout: 15_000
});

let transactionStarted = false;

try {
  await client.connect();
  await client.query("BEGIN");
  transactionStarted = true;

  await client.query(`
    create temporary table velura_db_write_check (
      id uuid primary key,
      created_at timestamptz not null default now()
    ) on commit drop
  `);

  const testId = randomUUID();
  const result = await client.query(
    "insert into velura_db_write_check (id) values ($1) returning id",
    [testId]
  );

  if (result.rows[0]?.id !== testId) {
    throw new Error("Database write verification returned an unexpected result");
  }

  await client.query("ROLLBACK");
  transactionStarted = false;
  console.log("Database write check passed; test transaction was rolled back.");
} catch (error) {
  if (transactionStarted) {
    await client.query("ROLLBACK").catch(() => {});
  }
  console.error(`Database write check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
