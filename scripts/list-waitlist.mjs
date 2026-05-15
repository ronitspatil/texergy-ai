#!/usr/bin/env node
/**
 * Quick CLI viewer for the waitlist DB.
 *
 * Usage:
 *   npm run waitlist:list           # pretty table to stdout
 *   npm run waitlist:list -- --csv  # CSV to stdout (pipe to a file)
 *   npm run waitlist:list -- --json # JSON array to stdout
 *
 * Reads from Supabase using NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

function loadEnvLocal() {
  const p = ".env.local";
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnvLocal();

const args = new Set(process.argv.slice(2));
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase
  .from("waitlist")
  .select("id, email, zip, referrer, created_at")
  .order("created_at", { ascending: false });

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

const rows = (data ?? []).map((r) => ({
  id: Number(r.id),
  email: String(r.email),
  zip: r.zip == null ? null : String(r.zip),
  referrer: r.referrer == null ? null : String(r.referrer),
  created_at: new Date(r.created_at).getTime(),
}));

const fmt = (ts) =>
  new Date(ts).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");

if (args.has("--json")) {
  process.stdout.write(
    JSON.stringify(
      rows.map((r) => ({ ...r, created_at_iso: fmt(r.created_at) })),
      null,
      2,
    ) + "\n",
  );
  process.exit(0);
}

if (args.has("--csv")) {
  const safe = (v) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  process.stdout.write("id,email,zip,referrer,created_at_iso\n");
  for (const r of rows) {
    process.stdout.write(
      [r.id, safe(r.email), safe(r.zip), safe(r.referrer), fmt(r.created_at)].join(",") + "\n",
    );
  }
  process.exit(0);
}

if (rows.length === 0) {
  console.log("(no signups yet)");
  console.log(`source: ${SUPABASE_URL}`);
  process.exit(0);
}

const cols = [
  { key: "id", label: "ID", w: 5 },
  { key: "email", label: "Email", w: 36 },
  { key: "zip", label: "ZIP", w: 6 },
  { key: "joined", label: "Joined (UTC)", w: 22 },
];
const pad = (s, w) => {
  s = s == null ? "" : String(s);
  return s.length >= w ? s.slice(0, w - 1) + "…" : s + " ".repeat(w - s.length);
};

console.log(cols.map((c) => pad(c.label, c.w)).join("  "));
console.log(cols.map((c) => "─".repeat(c.w)).join("  "));
for (const r of rows) {
  console.log(
    [
      pad(r.id, cols[0].w),
      pad(r.email, cols[1].w),
      pad(r.zip ?? "—", cols[2].w),
      pad(fmt(r.created_at), cols[3].w),
    ].join("  "),
  );
}
console.log("");
console.log(`${rows.length} ${rows.length === 1 ? "signup" : "signups"} · ${SUPABASE_URL}`);
