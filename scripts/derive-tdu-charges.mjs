#!/usr/bin/env node
/**
 * Derives the canonical delivery charge for each TDU from the EFLs that parsed
 * cleanly, and upserts one row per TDU into `tdu_delivery_charges`.
 *
 *   node scripts/derive-tdu-charges.mjs          # derive and write
 *   node scripts/derive-tdu-charges.mjs --dry    # print, write nothing
 *
 * Why derive instead of hardcoding the tariff: a TDU's delivery charge is
 * identical across every REP in its territory, so the parsed EFLs vote on it.
 * Within one TDU the parsed values cluster hard on a single value — the current
 * tariff — with the minority being EFLs issued under the previous one. Taking
 * the mode gets the current tariff without anyone tracking PUCT filings, and it
 * rolls over on its own once most REPs reissue after a tariff change.
 *
 * Runs after the EFL parse steps in the daily pipeline. Idempotent.
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

const DRY_RUN = process.argv.includes("--dry");

// Guardrails. A TDU needs enough parsed EFLs to vote, and the winner needs a
// clear plurality — if the field is split we'd rather keep yesterday's row than
// write a value derived from noise.
const MIN_SAMPLE = 20;
const MIN_AGREEMENT_PCT = 25;
// Sanity band for a Texas residential delivery charge. Anything outside it is a
// parse artifact, not a tariff.
const MIN_PER_KWH_CENTS = 1;
const MAX_PER_KWH_CENTS = 15;
const MAX_PER_MONTH_USD = 30;

/** Most common value in a list, with its share of the list. */
function mode(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  if (best == null) return null;
  return { value: best, count: bestCount, share: (bestCount / values.length) * 100 };
}

async function loadParsedCharges() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("plan_details")
      .select("tdu_charges, plans!inner ( active, tdu_id, tdus!inner ( code ) )")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows.filter((r) => r.plans?.active);
}

async function main() {
  const rows = await loadParsedCharges();

  // Bucket the plausible parsed values per TDU. Zeros are dropped on purpose:
  // no Texas TDU delivers for free, so a zero is a parser miss that would drag
  // the vote if counted.
  const byTdu = new Map();
  for (const row of rows) {
    const tduId = row.plans.tdu_id;
    const code = row.plans.tdus.code;
    const perKwh = row.tdu_charges?.per_kwh_cents;
    const perMonth = row.tdu_charges?.per_month_usd;

    const bucket = byTdu.get(tduId) ?? { code, perKwh: [], perMonth: [] };
    if (perKwh != null && perKwh >= MIN_PER_KWH_CENTS && perKwh <= MAX_PER_KWH_CENTS) {
      bucket.perKwh.push(perKwh);
    }
    if (perMonth != null && perMonth > 0 && perMonth <= MAX_PER_MONTH_USD) {
      bucket.perMonth.push(perMonth);
    }
    byTdu.set(tduId, bucket);
  }

  const upserts = [];
  for (const [tduId, bucket] of [...byTdu].sort((a, b) => a[0] - b[0])) {
    const kwh = mode(bucket.perKwh);
    const month = mode(bucket.perMonth);

    if (kwh == null || bucket.perKwh.length < MIN_SAMPLE) {
      console.warn(
        `skip ${bucket.code}: only ${bucket.perKwh.length} usable per-kWh values (need ${MIN_SAMPLE})`,
      );
      continue;
    }
    if (kwh.share < MIN_AGREEMENT_PCT) {
      console.warn(
        `skip ${bucket.code}: top per-kWh value ${kwh.value}¢ has only ${kwh.share.toFixed(0)}% agreement (need ${MIN_AGREEMENT_PCT}%)`,
      );
      continue;
    }

    // The monthly charge is allowed to be absent — some EFLs fold it into the
    // energy charge — but never invented. Zero is a real, if rare, answer here.
    const perMonthUsd = month?.value ?? 0;

    console.log(
      `${bucket.code}: ${kwh.value}¢/kWh + $${perMonthUsd}/mo ` +
        `(${kwh.count}/${bucket.perKwh.length} agree, ${kwh.share.toFixed(0)}%)`,
    );

    upserts.push({
      tdu_id: tduId,
      per_kwh_cents: kwh.value,
      per_month_usd: perMonthUsd,
      sample_size: bucket.perKwh.length,
      agreement_pct: Number(kwh.share.toFixed(2)),
      source: "derived_from_efls",
      derived_at: new Date().toISOString(),
    });
  }

  if (upserts.length === 0) {
    console.warn("no TDU cleared the guardrails — leaving existing rows alone");
    return;
  }
  if (DRY_RUN) {
    console.log(`\n--dry: would upsert ${upserts.length} row(s)`);
    return;
  }

  const { error } = await supabase
    .from("tdu_delivery_charges")
    .upsert(upserts, { onConflict: "tdu_id" });
  if (error) throw error;
  console.log(`\nupserted ${upserts.length} TDU delivery charge row(s)`);
}

await main();
