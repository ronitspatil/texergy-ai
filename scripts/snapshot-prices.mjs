#!/usr/bin/env node
/**
 * Captures one row per active TDU in `plan_price_snapshots`, summarizing the
 * distribution of active plan rates at 500/1000/2000 kWh. Mirrors the snapshot
 * step the daily cron runs in production; safe to run repeatedly (upserts on
 * snapshot_date,tdu_id).
 *
 *   node scripts/snapshot-prices.mjs            # snapshot for today (UTC)
 *   node scripts/snapshot-prices.mjs 2026-05-20 # backfill a specific date
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import ws from "ws";

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

function median(sorted) {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const rank = p * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const w = rank - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function avg(values) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round4(n) {
  return n == null ? null : Math.round(n * 10000) / 10000;
}

async function main() {
  // UTC date so this aligns with the cron's snapshots (which also use UTC).
  const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Bad date: ${date} (use YYYY-MM-DD)`);
  }

  console.log(`Snapshotting plan_price_snapshots for ${date} …`);

  const { data: plans, error: plansErr } = await supabase
    .from("plans")
    .select("tdu_id, rate_500_kwh, rate_1000_kwh, rate_2000_kwh")
    .eq("active", true)
    .not("tdu_id", "is", null);
  if (plansErr) throw plansErr;

  const byTdu = new Map();
  for (const p of plans ?? []) {
    if (p.tdu_id == null) continue;
    const arr = byTdu.get(p.tdu_id) ?? [];
    arr.push(p);
    byTdu.set(p.tdu_id, arr);
  }

  const rows = [];
  for (const [tdu_id, list] of byTdu) {
    const r500 = list.map((p) => p.rate_500_kwh).filter((x) => x != null).sort((a, b) => a - b);
    const r1000 = list.map((p) => p.rate_1000_kwh).filter((x) => x != null).sort((a, b) => a - b);
    const r2000 = list.map((p) => p.rate_2000_kwh).filter((x) => x != null).sort((a, b) => a - b);

    rows.push({
      snapshot_date: date,
      tdu_id,
      plan_count: list.length,
      avg_rate_500_kwh: round4(avg(r500)),
      avg_rate_1000_kwh: round4(avg(r1000)),
      avg_rate_2000_kwh: round4(avg(r2000)),
      median_rate_500_kwh: round4(median(r500)),
      median_rate_1000_kwh: round4(median(r1000)),
      median_rate_2000_kwh: round4(median(r2000)),
      p25_rate_1000_kwh: round4(percentile(r1000, 0.25)),
      p75_rate_1000_kwh: round4(percentile(r1000, 0.75)),
      min_rate_1000_kwh: r1000.length > 0 ? round4(r1000[0]) : null,
      max_rate_1000_kwh: r1000.length > 0 ? round4(r1000[r1000.length - 1]) : null,
    });
  }

  if (rows.length === 0) {
    console.log("No active plans with rates — nothing to snapshot.");
    return;
  }

  const { error } = await supabase
    .from("plan_price_snapshots")
    .upsert(rows, { onConflict: "snapshot_date,tdu_id" });
  if (error) throw error;

  console.log(`Snapshotted ${rows.length} TDUs across ${plans?.length ?? 0} plans.`);
  for (const r of rows) {
    console.log(
      `  tdu_id=${r.tdu_id} plans=${r.plan_count} median@1000kWh=${r.median_rate_1000_kwh}¢ p25=${r.p25_rate_1000_kwh}¢ p75=${r.p75_rate_1000_kwh}¢`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
