#!/usr/bin/env node
/**
 * EFL parser — Tier B (LlamaParse).
 *
 * For plans where the Tier A text-regex parser failed (parse_errors non-empty),
 * submit the EFL URL to LlamaParse, get back clean markdown, and run an
 * extended regex pass on it. LlamaParse handles image-only PDFs, table-only
 * layouts, and session-token URLs that the unpdf-based Tier A choked on.
 *
 *   node scripts/parse-efls-llamaparse.mjs              # all eligible
 *   node scripts/parse-efls-llamaparse.mjs --limit 5    # test on 5
 *   node scripts/parse-efls-llamaparse.mjs --tier agentic_plus  # higher quality
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LLAMA_CLOUD_API_KEY
 * from .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const PARSER_VERSION = "tier-b-llamaparse-v1";
const PARSER_TIER = "vision";
const LLAMA_BASE = "https://api.cloud.llamaindex.ai/api/v2/parse";
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;
const JOB_DELAY_MS = 200; // gap between submitting jobs

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
const LLAMA_KEY = process.env.LLAMA_CLOUD_API_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!LLAMA_KEY) {
  console.error("Missing LLAMA_CLOUD_API_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// CLI args
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;
const tierIdx = args.indexOf("--tier");
const tier = tierIdx >= 0 ? args[tierIdx + 1] : "cost_effective";
// --retry-failures: re-submit plans even when their efl_url matches the last
// LlamaParse attempt (llamaparse_source_url). Off by default to save credits.
const retryFailures = args.includes("--retry-failures");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function submitJob(eflUrl) {
  const res = await fetch(LLAMA_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LLAMA_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_url: eflUrl,
      tier,
      version: "latest",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LlamaParse submit HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.id;
}

async function fetchResult(jobId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${LLAMA_BASE}/${jobId}?expand=markdown`, {
      headers: { Authorization: `Bearer ${LLAMA_KEY}` },
    });
    if (!res.ok) {
      // 404 right after submit can happen briefly; keep polling.
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    const json = await res.json();
    const status = json?.job?.status;
    if (status === "COMPLETED") {
      const md = json?.markdown;
      const pages = Array.isArray(md?.pages) ? md.pages : [];
      return pages.map((p) => p.markdown ?? "").join("\n");
    }
    if (status === "FAILED" || status === "CANCELLED") {
      throw new Error(`LlamaParse job ${status}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error("LlamaParse poll timeout");
}

// Extended regex parser. Same fields as Tier A but with extra patterns to
// cover LlamaParse's markdown idiosyncrasies (dollar-per-kWh, table cells with
// pipes/asterisks, etc.).
function parseEfl(text) {
  const errors = [];
  const t = text.replace(/[ ]/g, " ").replace(/\s+/g, " ").trim();

  // ENERGY CHARGE — accept cents AND dollar-per-kWh.
  let energy_charge = null;

  // Unit alternation — match kWh or "kilowatt-hour" (LlamaParse sometimes spells it out).
  const KWH = "(?:kWh|kilowatt[-\\s]?hour)";
  // First try: cents/kWh. Accept "Energy Charge", "Energy Rate", "Energy Price".
  const centsMatch = firstMatch(t, [
    new RegExp(`Energy (?:Charge|Rate|Price)[^0-9$%]{0,40}?(\\d+\\.\\d+|\\d+)\\s*(?:¢|cents)\\s*(?:\\/|per)?\\s*${KWH}`, "i"),
    new RegExp(`Energy (?:Charge|Rate|Price)[^0-9$%]{0,80}?(\\d+\\.\\d+)\\s*(?:¢|cents)`, "i"),
  ]);
  if (centsMatch) {
    energy_charge = { type: "flat", cents_per_kwh: toFloat(centsMatch[1]) };
  } else {
    // Then try: $0.077298 per kWh → multiply by 100 for cents. Allow markdown
    // emphasis (asterisks) and "per kilowatt-hour" spellings.
    const dollarMatch = firstMatch(t, [
      new RegExp(`Energy (?:Charge|Rate|Price)[^0-9$%]{0,40}?\\$\\s*(\\d+\\.\\d+|\\.\\d+)\\s*\\*?\\s*(?:\\/|per)?\\s*${KWH}`, "i"),
    ]);
    if (dollarMatch) {
      const dollarsPerKwh = toFloat(dollarMatch[1]);
      if (dollarsPerKwh != null) {
        energy_charge = { type: "flat", cents_per_kwh: round3(dollarsPerKwh * 100) };
      }
    }
  }
  if (!energy_charge) errors.push("energy_charge_not_found");

  // BASE CHARGE — accept dollar with or without ¢ split.
  const baseMatch = firstMatch(t, [
    /Base (?:Monthly )?Charge[^0-9$]{0,15}\$\s*(\d+(?:\.\d+)?)/i,
    /Monthly (?:Base|Service|Customer) (?:Charge|Fee)[^0-9$]{0,15}\$\s*(\d+(?:\.\d+)?)/i,
    /Customer Charge[^0-9$]{0,15}\$\s*(\d+(?:\.\d+)?)/i,
  ]);
  const base_charge = baseMatch ? toFloat(baseMatch[1]) : null;

  // ETF.
  const etfMatch = firstMatch(t, [
    /Early Termination Fee[:\s]*\$\s*(\d+(?:\.\d+)?)/i,
    /Cancellation Fee[:\s]*\$\s*(\d+(?:\.\d+)?)/i,
    /Termination Fee[:\s]*\$\s*(\d+(?:\.\d+)?)/i,
    /\$\s*(\d+(?:\.\d+)?)\s*fee[^.]*?terminat/i,
    /terminat[^$]{0,80}\$\s*(\d+(?:\.\d+)?)/i,
  ]);
  const etf_amount = etfMatch ? toFloat(etfMatch[1]) : null;

  // MIN USAGE.
  const minMatch = firstMatch(t, [
    /Minimum Usage (?:Fee|Charge)[:\s]*\$\s*(\d+(?:\.\d+)?)/i,
  ]);
  const minimum_usage_fee = minMatch ? toFloat(minMatch[1]) : null;

  // TDU per-kWh (cents or dollars) + per-month.
  let tdu_per_kwh = null;
  const tduKwhCents = firstMatch(t, [
    /(?:Oncor|Centerpoint|AEP|TNMP|TDU|Delivery Charges?\*?)[^¢]{0,150}?(\d+\.\d+)\s*(?:¢|cents)\s*(?:\/|per)?\s*kWh/i,
  ]);
  if (tduKwhCents) {
    tdu_per_kwh = toFloat(tduKwhCents[1]);
  } else {
    const tduKwhDollars = firstMatch(t, [
      /(?:Oncor|Centerpoint|AEP|TNMP|TDU|Delivery Charges?\*?)[^$]{0,150}?\$\s*(\d+\.\d+|\.\d+)\s*(?:\/|per)?\s*kWh/i,
    ]);
    if (tduKwhDollars) tdu_per_kwh = round3(toFloat(tduKwhDollars[1]) * 100);
  }
  const tduMonthMatch = firstMatch(t, [
    /(?:Oncor|Centerpoint|AEP|TNMP|TDU|Delivery Charges?\*?)[^$]{0,150}?\$\s*(\d+(?:\.\d+)?)\s*(?:per\s+(?:billing\s+cycle|bill\s+month|month)|\/\s*month)/i,
  ]);
  const tdu_charges = tdu_per_kwh != null || tduMonthMatch
    ? {
        per_kwh_cents: tdu_per_kwh,
        per_month_usd: tduMonthMatch ? toFloat(tduMonthMatch[1]) : null,
      }
    : null;

  // Bill credit.
  const billCreditMatch = firstMatch(t, [
    /(?:Bill Credit|Usage Credit|Monthly Bill Credit|Residential Usage Credit)[^$\d]{0,30}\$\s*(\d+(?:\.\d+)?)[^.]{0,80}?(?:>=|>|at\s+)?(\d[,\d]*)\s*kWh/i,
    /\$\s*(\d+(?:\.\d+)?)\s*(?:bill|usage)\s*credit[^.]{0,60}?(?:>=|>|at\s+)?(\d[,\d]*)\s*kWh/i,
  ]);
  const bill_credits = billCreditMatch
    ? {
        amount: toFloat(billCreditMatch[1]),
        threshold_kwh: parseInt(billCreditMatch[2].replace(/,/g, ""), 10),
      }
    : null;

  return {
    base_charge,
    etf_amount,
    minimum_usage_fee,
    energy_charge,
    bill_credits,
    tdu_charges,
    raw_text: text.slice(0, 8000),
    parse_errors: errors,
  };
}

function firstMatch(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m;
  }
  return null;
}
function toFloat(s) {
  if (s == null) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
function round3(n) {
  return Math.round(n * 1000) / 1000;
}

async function loadEligiblePlans() {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, efl_url, plan_details ( plan_id, parser_version, parse_errors, llamaparse_source_url )")
    .eq("active", true)
    .not("efl_url", "is", null);
  if (error) throw error;

  const detailsOf = (p) =>
    Array.isArray(p.plan_details) ? p.plan_details : p.plan_details ? [p.plan_details] : [];

  // Eligible = any plan whose current row has a non-empty parse_errors[] AND
  // whose efl_url differs from what we last submitted to LlamaParse
  // (llamaparse_source_url). Without the URL gate a recurring run re-submits
  // the same broken PDFs every night and burns credits. Pass --retry-failures
  // to ignore the gate. We intentionally include rows from the prior tier
  // (tier-a-v1) so we can upgrade them in place.
  let eligible = data.filter((p) =>
    detailsOf(p).some(
      (d) =>
        (d.parse_errors?.length ?? 0) > 0 &&
        (retryFailures || d.llamaparse_source_url !== p.efl_url),
    ),
  );
  if (limit != null) eligible = eligible.slice(0, limit);
  return eligible;
}

// Stamp the URL we just submitted — success or failure — so the next run
// skips this plan unless PTC publishes a new fact-sheet URL.
async function stampSourceUrl(planId, eflUrl) {
  const { error } = await supabase
    .from("plan_details")
    .update({ llamaparse_source_url: eflUrl })
    .eq("plan_id", planId);
  if (error) {
    console.warn(`  could not stamp llamaparse_source_url for plan ${planId}: ${error.message}`);
  }
}

async function upsertDetails(planId, parsed, eflUrl) {
  const row = {
    plan_id: planId,
    parsed_at: new Date().toISOString(),
    parser_version: PARSER_VERSION,
    parser_tier: PARSER_TIER,
    llamaparse_source_url: eflUrl,
    base_charge: parsed.base_charge,
    etf_amount: parsed.etf_amount,
    minimum_usage_fee: parsed.minimum_usage_fee,
    energy_charge: parsed.energy_charge,
    bill_credits: parsed.bill_credits,
    tdu_charges: parsed.tdu_charges,
    raw_text: parsed.raw_text,
    parse_errors: parsed.parse_errors,
  };
  const { error } = await supabase.from("plan_details").upsert(row, { onConflict: "plan_id" });
  if (error) throw error;
}

async function main() {
  const eligible = await loadEligiblePlans();
  console.log(`▸ ${eligible.length} plan${eligible.length === 1 ? "" : "s"} to re-parse via LlamaParse (tier=${tier})`);

  let recovered = 0;
  let stillFailed = 0;
  let llamaFailed = 0;
  const llamaFailureReasons = new Map();

  for (let i = 0; i < eligible.length; i++) {
    const plan = eligible[i];
    const tag = `[${i + 1}/${eligible.length}] plan ${plan.id} (${plan.name})`;
    try {
      const jobId = await submitJob(plan.efl_url);
      const markdown = await fetchResult(jobId);
      const result = parseEfl(markdown);
      await upsertDetails(plan.id, result, plan.efl_url);
      if (result.energy_charge) {
        recovered++;
        if (recovered % 10 === 0) {
          console.log(`  ${tag} ✓ recovered (${recovered} so far)`);
        }
      } else {
        stillFailed++;
      }
    } catch (err) {
      llamaFailed++;
      const reason = (err.message || String(err)).slice(0, 120);
      llamaFailureReasons.set(reason, (llamaFailureReasons.get(reason) ?? 0) + 1);
      // Don't overwrite the existing row on hard LlamaParse failure — keep the
      // Tier A error so we know not to retry forever. Still stamp the URL so
      // the nightly run doesn't re-burn credits on the same broken PDF.
      await stampSourceUrl(plan.id, plan.efl_url);
    }
    await sleep(JOB_DELAY_MS);
  }

  console.log("");
  console.log(`✓ recovered (energy_charge populated): ${recovered}`);
  console.log(`◦ parsed but still no energy_charge:    ${stillFailed}`);
  console.log(`✗ LlamaParse hard failures:             ${llamaFailed}`);
  if (llamaFailureReasons.size > 0) {
    console.log("LlamaParse failure reasons:");
    for (const [reason, count] of [...llamaFailureReasons.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}×  ${reason}`);
    }
  }
}

await main();
