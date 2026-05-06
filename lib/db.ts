import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Database connection.
 *
 * In production (Vercel) we point at Turso (libSQL hosted as HTTP).
 * In local development we fall back to a SQLite file under ./data so
 * `npm run dev` works with no setup.
 *
 * Set both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN as environment variables
 * (e.g. on Vercel) to use the cloud database.
 */
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const LOCAL_DB_PATH = process.env.WAITLIST_DB_PATH ?? "./data/waitlist.db";

let client: Client | null = null;
let initialized = false;

function getClient(): Client {
  if (client) return client;

  if (TURSO_URL && TURSO_TOKEN) {
    client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  } else {
    // Local fallback — libsql understands `file:` URLs natively.
    mkdirSync(dirname(LOCAL_DB_PATH), { recursive: true });
    client = createClient({ url: `file:${LOCAL_DB_PATH}` });
  }

  return client;
}

async function ensureSchema(): Promise<void> {
  if (initialized) return;
  const c = getClient();
  await c.batch(
    [
      `CREATE TABLE IF NOT EXISTS waitlist (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         email TEXT NOT NULL UNIQUE,
         zip TEXT,
         referrer TEXT,
         created_at INTEGER NOT NULL,
         ip_hash TEXT
       )`,
      `CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at)`,
    ],
    "write",
  );
  initialized = true;
}

export type WaitlistInsert = {
  email: string;
  zip?: string | null;
  referrer?: string | null;
  ipHash?: string | null;
};

export async function addToWaitlist(
  entry: WaitlistInsert,
): Promise<{ inserted: boolean }> {
  await ensureSchema();
  const c = getClient();
  const result = await c.execute({
    sql: `INSERT OR IGNORE INTO waitlist (email, zip, referrer, created_at, ip_hash)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      entry.email,
      entry.zip ?? null,
      entry.referrer ?? null,
      Date.now(),
      entry.ipHash ?? null,
    ],
  });
  return { inserted: result.rowsAffected > 0 };
}

export async function waitlistCount(): Promise<number> {
  await ensureSchema();
  const c = getClient();
  const result = await c.execute("SELECT COUNT(*) as c FROM waitlist");
  const row = result.rows[0];
  return row ? Number(row.c) : 0;
}

export type WaitlistRow = {
  id: number;
  email: string;
  zip: string | null;
  referrer: string | null;
  created_at: number;
};

export async function listWaitlist(
  opts: { limit?: number; offset?: number } = {},
): Promise<WaitlistRow[]> {
  await ensureSchema();
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
  const offset = Math.max(opts.offset ?? 0, 0);
  const c = getClient();
  const result = await c.execute({
    sql: `SELECT id, email, zip, referrer, created_at
          FROM waitlist
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  return result.rows.map((r) => ({
    id: Number(r.id),
    email: String(r.email),
    zip: r.zip == null ? null : String(r.zip),
    referrer: r.referrer == null ? null : String(r.referrer),
    created_at: Number(r.created_at),
  }));
}
