#!/usr/bin/env node
/**
 * EFL (Electricity Facts Label) parser — Tier A.
 *
 * Iterates plans with efl_url that don't yet have a plan_details row for the
 * current parser_version. For each: fetches the PDF, extracts text via unpdf,
 * runs regex heuristics for base_charge / etf_amount / energy_charge / etc.,
 * upserts plan_details. Logs per-plan failures to parse_errors[] so a future
 * Tier B (vision LLM) pass can target the stragglers.
 *
 *   node scripts/parse-efls.mjs              # parse all eligible plans
 *   node scripts/parse-efls.mjs --limit 20   # parse up to 20 (for testing)
 *   node scripts/parse-efls.mjs --reparse    # ignore existing rows, redo all
 *   node scripts/parse-efls.mjs --url-changed  # only plans whose efl_url no longer matches plan_details.source_url
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { extractText, getDocumentProxy } from "unpdf";
import { existsSync, readFileSync } from "node:fs";

// v2 = adds Free Nights / Free Weekends detection. Bump in lock-step with
// lib/jobs/parse-efls.ts so the weekly cron and the CLI agree on what
// constitutes a "stale" plan_details row.
const PARSER_VERSION = "tier-a-v2";
const PARSER_TIER = "text";
const REQUEST_DELAY_MS = 150;     // be polite to small REP CDNs
const FETCH_TIMEOUT_MS = 20_000;

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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// CLI args
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;
const reparse = args.includes("--reparse");
const retryFailures = args.includes("--retry-failures");
// --url-changed: re-parse plans where plans.efl_url no longer matches
// plan_details.source_url (covers genuine URL changes after a fresh PTC
// ingest, AND new plans whose source_url is still null). Mirrors the
// gating logic used by the weekly cron's runParseEflsChanged.
const urlChanged = args.includes("--url-changed");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPdf(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TexergyAI/1.0)" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46). Some REPs return HTML when
    // their PDF generator session is missing — we want to detect that.
    if (buf.length < 4 || buf[0] !== 0x25 || buf[1] !== 0x50 || buf[2] !== 0x44 || buf[3] !== 0x46) {
      throw new Error("not_a_pdf");
    }
    return buf;
  } finally {
    clearTimeout(t);
  }
}

async function extractEflText(buf) {
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

// Try a list of regex patterns in order; return the first non-null match group.
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

// Convert a 12-hour reading ("9", "pm") to a 0–23 hour. Mirrors the helper
// in lib/jobs/efl-parse.ts. 12am → 0, 12pm → 12.
function parseHour12(hourStr, ampm) {
  const h = parseInt(hourStr, 10);
  if (!Number.isFinite(h) || h < 1 || h > 12) return null;
  const isPm = /p/i.test(ampm);
  if (h === 12) return isPm ? 12 : 0;
  return isPm ? h + 12 : h;
}

// Parse one EFL's extracted text into structured fields.
// Returns { base_charge, etf_amount, minimum_usage_fee, energy_charge,
//           tdu_charges, raw_text, parse_errors }.
function parseEfl(text) {
  const errors = [];
  // Normalize whitespace so multi-line labels match single-line regexes.
  const t = text.replace(/[ ]/g, " ").replace(/\s+/g, " ").trim();

  // ENERGY CHARGE (cents/kWh) — the headline supplier rate.
  // Accept: "Energy Charge: 7.162 cents/kWh", "Energy Charge 13.69¢ per kWh",
  // "Energy Charge (per kWh) 7.3¢/kWh", "Energy Charge: 9.2¢ per kWh".
  const energyMatch = firstMatch(t, [
    // Label, then number, then ¢ or "cents", then optional "/" or "per", then kWh.
    /Energy Charge[^0-9$%]{0,40}?(\d+\.\d+|\d+)\s*(?:¢|cents)\s*(?:\/|per)?\s*kWh/i,
    // Number first, then ¢/cents per kWh, with "Energy Charge" appearing nearby (loose fallback).
    /Energy Charge[^0-9$%]{0,80}?(\d+\.\d+)\s*(?:¢|cents)/i,
  ]);
  let energy_charge = null;
  if (energyMatch) {
    energy_charge = { type: "flat", cents_per_kwh: toFloat(energyMatch[1]) };
  } else {
    errors.push("energy_charge_not_found");
  }

  // TIME-OF-USE DETECTION — Free Nights / Free Weekends. Conservative: only
  // promotes the energy_charge to type:"tou" when an explicit phrase + hour
  // window is parseable. Keeps the flat schema otherwise.
  if (energy_charge && energy_charge.type === "flat" && energy_charge.cents_per_kwh != null) {
    const windows = [];
    const nightsMatch = t.match(
      /Free\s*Nights?[^.]{0,120}?(\d{1,2})(?:[:.]\d{2})?\s*(a\.?m\.?|p\.?m\.?)\s*(?:to|until|–|—|-)\s*(\d{1,2})(?:[:.]\d{2})?\s*(a\.?m\.?|p\.?m\.?)/i,
    );
    if (nightsMatch) {
      const start = parseHour12(nightsMatch[1], nightsMatch[2]);
      const end = parseHour12(nightsMatch[3], nightsMatch[4]);
      if (start != null && end != null) {
        windows.push({ label: "Free Nights", start_hour: start, end_hour: end, days: "all", cents_per_kwh: 0 });
      } else {
        errors.push("free_nights_hours_unparseable");
      }
    }
    if (/Free\s*Weekends?\b/i.test(t)) {
      windows.push({ label: "Free Weekends", start_hour: 0, end_hour: 24, days: "weekends", cents_per_kwh: 0 });
    }
    if (windows.length > 0) {
      energy_charge = { type: "tou", default_cents_per_kwh: energy_charge.cents_per_kwh, windows };
    }
  }

  // BASE CHARGE ($/month). Many REPs genuinely have no base charge — null
  // means "not present in this plan," not "parser failed." We only flag this
  // as an error if energy_charge ALSO failed (then both being null suggests
  // the EFL is unparseable, not legitimately base-charge-free).
  const baseMatch = firstMatch(t, [
    /Base (?:Monthly )?Charge[^0-9$]{0,15}\$\s*(\d+(?:\.\d+)?)/i,
    /Monthly (?:Base|Service|Customer) (?:Charge|Fee)[^0-9$]{0,15}\$\s*(\d+(?:\.\d+)?)/i,
    /Customer Charge[^0-9$]{0,15}\$\s*(\d+(?:\.\d+)?)/i,
  ]);
  const base_charge = baseMatch ? toFloat(baseMatch[1]) : null;

  // EARLY TERMINATION FEE ($)
  const etfMatch = firstMatch(t, [
    /Early Termination Fee[:\s]+\$\s*(\d+(?:\.\d+)?)/i,
    /Cancellation Fee[:\s]+\$\s*(\d+(?:\.\d+)?)/i,
    /Termination Fee[:\s]+\$\s*(\d+(?:\.\d+)?)/i,
    /\$\s*(\d+(?:\.\d+)?)\s*fee[^.]*?terminat/i,
    /terminat[^$]{0,80}\$\s*(\d+(?:\.\d+)?)/i,
  ]);
  const etf_amount = etfMatch ? toFloat(etfMatch[1]) : null;
  // Note: some month-to-month plans have $0 ETF and may legitimately not match.

  // MINIMUM USAGE FEE ($)
  const minMatch = firstMatch(t, [
    /Minimum Usage (?:Fee|Charge)[:\s]+\$\s*(\d+(?:\.\d+)?)/i,
  ]);
  const minimum_usage_fee = minMatch ? toFloat(minMatch[1]) : null;

  // TDU CHARGES (per kWh + per month pass-throughs). REPs put these in two
  // forms: combined on one line, or split across two lines (per_kwh and
  // per_month separately). Search per-component to handle both.
  // Also accept "$" as either prefix or suffix ("$3.24" or "3.24 $").
  const tduKwhMatch = firstMatch(t, [
    /(?:Oncor|Centerpoint|AEP|TNMP|TDU|Delivery Charges?\*?)[^¢]{0,150}?(\d+\.\d+)\s*(?:¢|cents)\s*(?:\/|per)?\s*kWh/i,
  ]);
  const tduMonthMatch = firstMatch(t, [
    /(?:Oncor|Centerpoint|AEP|TNMP|TDU|Delivery Charges?\*?)[^$]{0,150}?\$\s*(\d+(?:\.\d+)?)\s*(?:per\s+(?:billing\s+cycle|bill\s+month|month)|\/\s*month)/i,
    /(?:Oncor|Centerpoint|AEP|TNMP|TDU|Delivery Charges?\*?)[^0-9$]{0,150}?(\d+(?:\.\d+)?)\s*\$\s*per\s+(?:bill\s+month|month|billing\s+cycle)/i,
  ]);
  const tdu_charges = (tduKwhMatch || tduMonthMatch)
    ? {
        per_kwh_cents: tduKwhMatch ? toFloat(tduKwhMatch[1]) : null,
        per_month_usd: tduMonthMatch ? toFloat(tduMonthMatch[1]) : null,
      }
    : null;

  // BILL CREDIT (scalar): "$X bill credit at >=1000 kWh" — very common.
  // Stored as { amount, threshold_kwh } for now; tier-B parser can promote
  // to a full tier ladder later.
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
    raw_text: text.slice(0, 8000), // keep ~first 2-3 pages worth for debugging
    parse_errors: errors,
  };
}

async function loadEligiblePlans() {
  // Pull all active plans with an EFL URL. If --reparse not set, exclude ones
  // already parsed at this parser_version. If --retry-failures is set,
  // *include* only plans whose existing row at this parser_version has a
  // non-empty parse_errors[] — useful for retrying transient fetch failures
  // without redoing the ~530 already-successful parses.
  let query = supabase
    .from("plans")
    .select("id, efl_url, plan_details ( plan_id, parser_version, parse_errors, source_url )")
    .eq("active", true)
    .not("efl_url", "is", null);
  const { data, error } = await query;
  if (error) throw error;

  // Supabase returns 1:1 relations as objects and 1:many as arrays. plan_details
  // is 1:1 (plan_id is both FK and PK), so normalize to an array for filter ops.
  const detailsOf = (p) =>
    Array.isArray(p.plan_details) ? p.plan_details : p.plan_details ? [p.plan_details] : [];

  let eligible = data;
  if (retryFailures) {
    eligible = data.filter((p) =>
      detailsOf(p).some(
        (d) => d.parser_version === PARSER_VERSION && (d.parse_errors?.length ?? 0) > 0,
      ),
    );
  } else if (urlChanged) {
    eligible = data.filter((p) => {
      const d = detailsOf(p)[0];
      const sourceUrl = d?.source_url ?? null;
      return p.efl_url && sourceUrl !== p.efl_url;
    });
  } else if (!reparse) {
    eligible = data.filter(
      (p) => !detailsOf(p).some((d) => d.parser_version === PARSER_VERSION),
    );
  }
  if (limit != null) eligible = eligible.slice(0, limit);
  return eligible;
}

async function upsertDetails(planId, parsed, sourceUrl) {
  const row = {
    plan_id: planId,
    parsed_at: new Date().toISOString(),
    parser_version: PARSER_VERSION,
    parser_tier: PARSER_TIER,
    // Stamp source_url so future runs with --url-changed can detect when
    // PTC swaps in a new URL for the same plan. Also prevents retrying the
    // same broken URL every run.
    source_url: sourceUrl,
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
  console.log(`▸ ${eligible.length} plan${eligible.length === 1 ? "" : "s"} to parse (parser_version=${PARSER_VERSION}${reparse ? ", --reparse" : ""})`);

  let parsed = 0;
  let failed = 0;
  const failureReasons = new Map();

  for (const plan of eligible) {
    try {
      const buf = await fetchPdf(plan.efl_url);
      const text = await extractEflText(buf);
      const result = parseEfl(text);
      await upsertDetails(plan.id, result, plan.efl_url);
      parsed++;
      // Brief log every 50 to show progress without spamming
      if (parsed % 50 === 0) {
        console.log(`  parsed ${parsed} / ${eligible.length}…`);
      }
    } catch (err) {
      failed++;
      const reason = err.message || String(err);
      failureReasons.set(reason, (failureReasons.get(reason) ?? 0) + 1);
      // Still record a row so we can target Tier B later
      await upsertDetails(plan.id, {
        base_charge: null, etf_amount: null, minimum_usage_fee: null,
        energy_charge: null, bill_credits: null, tdu_charges: null,
        raw_text: null,
        parse_errors: [`fetch_or_extract_failed:${reason}`.slice(0, 200)],
      }, plan.efl_url).catch(() => {});
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log("");
  console.log(`✓ parsed: ${parsed}   ✗ failed: ${failed}`);
  if (failureReasons.size > 0) {
    console.log("Failure reasons:");
    for (const [reason, count] of [...failureReasons.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}×  ${reason}`);
    }
  }
}

await main();
