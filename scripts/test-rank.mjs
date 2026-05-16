#!/usr/bin/env node
/**
 * CLI smoke-tester for the ranking engine.
 *
 *   node scripts/test-rank.mjs --zip 78364
 *   node scripts/test-rank.mjs --zip 75201 --usage 1500
 *   node scripts/test-rank.mjs --zip 78364 --weights cost=0.2,renewable=0.5
 *   node scripts/test-rank.mjs --zip 78364 --filter rateType=Fixed,minRenewablePct=80
 *
 * Imports the lib/ranking/* TS files via --experimental-strip-types.
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { existsSync, readFileSync } from "node:fs";

function loadEnvLocal() {
  const p = ".env.local";
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnvLocal();

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function parseKv(s) {
  if (!s) return undefined;
  const out = {};
  for (const pair of s.split(",")) {
    const [k, v] = pair.split("=");
    if (!k) continue;
    const trimmed = (v ?? "").trim();
    if (trimmed === "true") out[k] = true;
    else if (trimmed === "false") out[k] = false;
    else if (!Number.isNaN(Number(trimmed)) && trimmed !== "") out[k] = Number(trimmed);
    else out[k] = trimmed;
  }
  return out;
}

const zip = arg("zip", "78364");
const usage = parseInt(arg("usage", "1000"), 10);
const weights = parseKv(arg("weights"));
const filters = parseKv(arg("filter"));
const limit = parseInt(arg("limit", "10"), 10);

const { recommend } = await import("../lib/ranking/recommend.ts");

const result = await recommend({
  zip,
  monthlyUsageKwh: usage,
  weights,
  filters,
  limit,
});

console.log(`ZIP ${zip} · usage ${usage} kWh/mo · TDUs: ${result.tduCodes.join(", ") || "(none resolved)"}`);
console.log(`${result.candidateCount} candidates → top ${result.ranked.length}`);
if (weights) console.log("weights:", weights);
if (filters) console.log("filters:", filters);
console.log("");

const col = (s, w) => {
  const str = s == null ? "" : String(s);
  return str.length >= w ? str.slice(0, w - 1) + "…" : str + " ".repeat(w - str.length);
};

console.log(
  col("#", 3) + col("REP", 22) + col("PLAN", 28) + col("RATE", 6) +
  col("TERM", 5) + col("RENW", 5) + col("$/MO", 7) + col("SRC", 9) + "  REASONS",
);
console.log("-".repeat(110));
result.ranked.forEach((r, i) => {
  console.log(
    col(i + 1, 3) +
    col(r.plan.rep_name, 22) +
    col(r.plan.name, 28) +
    col(r.plan.rate_type ?? "?", 6) +
    col(r.plan.term_months ?? "?", 5) +
    col(r.plan.renewable_pct != null ? `${r.plan.renewable_pct}%` : "?", 5) +
    col(`$${r.estMonthlyBillUsd}`, 7) +
    col(r.costSource === "parsed_efl" ? "efl" : "ptc", 9) +
    "  " + (r.reasons.join(" · ") || "—"),
  );
});
