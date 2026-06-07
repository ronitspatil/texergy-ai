#!/usr/bin/env node
/**
 * EFL parser — Tier C (Gemini structured extraction).
 *
 * Last-resort tier for plans where both the Tier A text-regex parser and
 * Tier B (LlamaParse + extended regex) failed (parse_errors non-empty).
 * Sends the EFL to Gemini with a JSON response schema and upserts the
 * extracted charges. Input preference:
 *   1. plan_details.raw_text (already extracted by Tier A/B) — cheapest
 *   2. the EFL PDF itself, fetched and inlined — Gemini reads PDFs natively,
 *      which also covers image-only PDFs that defeated text extraction
 *
 * URL-gated like Tier B: gemini_source_url is stamped on every attempt
 * (success or failure) so the nightly run never re-spends quota on the same
 * unchanged PDF.
 *
 *   node scripts/parse-efls-gemini.mjs                  # all eligible
 *   node scripts/parse-efls-gemini.mjs --limit 5        # test on 5
 *   node scripts/parse-efls-gemini.mjs --retry-failures # ignore the URL gate
 *   node scripts/parse-efls-gemini.mjs --model gemini-2.5-pro
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 * from .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const PARSER_VERSION = "tier-c-gemini-v1";
const PARSER_TIER = "vision";
const DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const FETCH_TIMEOUT_MS = 20_000;
// Free-tier Gemini Flash allows ~10 requests/minute; stay safely under it.
const REQUEST_DELAY_MS = 7_000;
const MAX_RETRIES_429 = 3;

// REP CDNs (Tara/Amigo in particular) reject Node's default fetch UA as a
// bot; a browser UA gets the same PDF a human would.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/pdf,*/*",
};

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
const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!GEMINI_KEY) {
  console.error("Missing GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// CLI args
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;
const modelIdx = args.indexOf("--model");
const model = modelIdx >= 0 ? args[modelIdx + 1] : DEFAULT_MODEL;
const retryFailures = args.includes("--retry-failures");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Response schema mirrors lib/ranking/types.ts PlanForScoring exactly, so the
// upserted JSONB needs no translation layer.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    base_charge: {
      type: "number",
      nullable: true,
      description: "Fixed monthly base/service/customer charge in dollars, charged by the energy provider (not the TDU). Null if none.",
    },
    etf_amount: {
      type: "number",
      nullable: true,
      description: "Early termination/cancellation fee in dollars. If charged per remaining month, the per-month amount. Null if none.",
    },
    minimum_usage_fee: {
      type: "number",
      nullable: true,
      description: "Monthly fee in dollars charged when usage falls below a threshold. Null if none.",
    },
    energy_charge: {
      type: "object",
      nullable: true,
      description: "The provider's energy charge. Use type 'flat' for a single rate; 'tou' for time-of-use plans (free nights, free weekends, peak/off-peak).",
      properties: {
        type: { type: "string", enum: ["flat", "tou"] },
        cents_per_kwh: {
          type: "number",
          nullable: true,
          description: "Flat plans only: rate in CENTS per kWh (convert from $/kWh by multiplying by 100; e.g. $0.077298/kWh = 7.7298).",
        },
        default_cents_per_kwh: {
          type: "number",
          nullable: true,
          description: "TOU plans only: the rate in cents/kWh that applies outside all special windows.",
        },
        windows: {
          type: "array",
          nullable: true,
          description: "TOU plans only: each special-rate window.",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "e.g. 'free nights'" },
              start_hour: { type: "integer", description: "0-23, window start" },
              end_hour: { type: "integer", description: "0-23, window end (exclusive); a 9pm-7am window is start 21 end 7" },
              days: { type: "string", enum: ["all", "weekdays", "weekends"] },
              cents_per_kwh: { type: "number", description: "Rate inside the window in cents/kWh; 0 for free" },
            },
            required: ["label", "start_hour", "end_hour", "days", "cents_per_kwh"],
          },
        },
      },
      required: ["type"],
    },
    tdu_charges: {
      type: "object",
      nullable: true,
      description: "TDU/utility delivery charges passed through to the customer (Oncor, CenterPoint, AEP, TNMP).",
      properties: {
        per_kwh_cents: { type: "number", nullable: true, description: "Delivery charge in cents per kWh (convert from $/kWh by multiplying by 100)." },
        per_month_usd: { type: "number", nullable: true, description: "Fixed monthly delivery charge in dollars." },
      },
    },
    bill_credits: {
      type: "object",
      nullable: true,
      description: "Usage-based bill credit, if the plan has one. If there are multiple tiers, use the one at the lowest qualifying usage.",
      properties: {
        amount: { type: "number", description: "Credit amount in dollars." },
        threshold_kwh: { type: "integer", description: "Minimum monthly kWh to qualify." },
      },
      required: ["amount", "threshold_kwh"],
    },
  },
};

const PROMPT = `You are reading a Texas Electricity Facts Label (EFL). Extract the pricing components into the requested JSON shape.

Rules:
- All per-kWh rates must be in CENTS per kWh. EFLs often quote $/kWh (e.g. "$0.077298 per kWh") — multiply those by 100 (= 7.7298).
- The "energy charge" is the provider's own rate, NOT the average price disclosure (the 500/1000/2000 kWh table) and NOT the TDU delivery charge. Do not derive it from the average-price table.
- "Free nights"/"free weekends"/peak-offpeak plans are type "tou": the free window has cents_per_kwh 0.
- TDU/TDSP delivery charges (Oncor, CenterPoint, AEP, TNMP) go in tdu_charges.
- Use null for anything genuinely absent. Do not guess.`;

async function callGemini(parts) {
  const url = `${GEMINI_BASE}/${model}:generateContent`;
  let attempt = 0;
  for (;;) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-goog-api-key": GEMINI_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });
    if (res.status === 429 || res.status === 503) {
      attempt++;
      if (attempt > MAX_RETRIES_429) throw new Error(`Gemini HTTP ${res.status} after ${MAX_RETRIES_429} retries`);
      const backoff = 15_000 * attempt;
      console.log(`  rate limited (HTTP ${res.status}); waiting ${backoff / 1000}s`);
      await sleep(backoff);
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
    if (!text) throw new Error(`Gemini returned no text (finishReason=${json?.candidates?.[0]?.finishReason})`);
    return JSON.parse(text);
  }
}

// Fetch the EFL URL and classify what came back. Several REPs serve HTML
// instead of a PDF:
//   - Octopus Energy renders the EFL from structured JSON embedded in the
//     page (__NEXT_DATA__.props.pageProps.eflSnapshot) — we map that
//     directly, no LLM needed.
//   - True Power serves a PDF-to-HTML rendering whose text IS the EFL —
//     we strip tags and send the text to Gemini.
//   - TriEagle's /PDFGenerator URL is a JS shell; the PDF itself comes from
//     /api/getdocument with renamed query params (discovered by watching the
//     page's network traffic) — we rewrite the URL before fetching.
// Returns {kind: "pdf", buf} | {kind: "octopus", snapshot} | {kind: "text", text}.
function rewriteEflUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "shopping.trieagleenergy.com" && u.pathname === "/PDFGenerator") {
      const q = u.searchParams;
      const today = new Date().toISOString().slice(0, 10);
      const api = new URL("https://shopping.trieagleenergy.com/api/getdocument");
      api.searchParams.set("docType", q.get("formType") ?? "EnergyFactsLabel");
      api.searchParams.set("productid", q.get("comProdId") ?? "");
      api.searchParams.set("efldate", `${today}T00:00:00`);
      api.searchParams.set("tdsp", q.get("tdsp") ?? "");
      api.searchParams.set("language", q.get("lang") ?? "en");
      api.searchParams.set("classification", q.get("custClass") ?? "Residential");
      return api.toString();
    }
  } catch {
    /* leave malformed URLs untouched */
  }
  return url;
}

async function fetchEflContent(rawUrl) {
  const url = rewriteEflUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return { kind: "pdf", buf };

    const html = buf.toString("utf8");

    const next = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (next) {
      try {
        const snapshot = JSON.parse(next[1])?.props?.pageProps?.eflSnapshot;
        if (snapshot?.snapshotData?.rates) return { kind: "octopus", snapshot };
      } catch {
        /* fall through to text handling */
      }
    }

    const text = html
      .replace(/<(script|style)[^>]*>.*?<\/\1>/gis, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&amp;|&#\d+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 500 && /electricity facts|average price per kwh/i.test(text)) {
      return { kind: "text", text };
    }
    throw new Error("not_a_pdf");
  } finally {
    clearTimeout(timer);
  }
}

// Octopus embeds exact rates in the page JSON; mapping them beats asking an
// LLM to re-derive them. Units (verified against the page's own average-price
// table: energy 8.5145¢ + tdu 5.8272¢ + 324¢/mo standing = 14.6657¢ @1000kWh):
//   energyCharge / serviceProviderConsumptionRate — cents per kWh
//   serviceProviderStandingRate / cancellationFee / monthlySubscriptionFees — cents
function extractOctopus(snapshot) {
  const d = snapshot.snapshotData;
  const r = d.rates;
  const num = (v) => (v == null || v === "" ? null : Number(v));
  // TOU products carry their windows elsewhere in the snapshot; punt those to
  // a human rather than guess (none observed in the wild so far).
  if (d.productDetails?.basedOnTimeOfUse) throw new Error("octopus_tou_unsupported");
  const centsToUsd = (v) => (num(v) == null ? null : num(v) / 100);
  return {
    base_charge: centsToUsd(r.monthlySubscriptionFees) ?? 0,
    etf_amount: centsToUsd(d.productDetails?.cancellationFee),
    minimum_usage_fee: null,
    energy_charge: num(r.energyCharge) != null ? { type: "flat", cents_per_kwh: num(r.energyCharge) } : null,
    tdu_charges: {
      per_kwh_cents: num(r.serviceProviderConsumptionRate),
      per_month_usd: centsToUsd(r.serviceProviderStandingRate),
    },
    bill_credits: null,
  };
}

// Sanity-check the extraction so a hallucinated or mis-scaled rate never
// reaches the ranking engine. Texas retail rates live in single-digit to
// low-double-digit cents.
function validate(parsed) {
  const errors = [];
  const e = parsed.energy_charge;
  if (!e) {
    errors.push("energy_charge_not_found");
  } else if (e.type === "flat") {
    if (e.cents_per_kwh == null || e.cents_per_kwh < 1 || e.cents_per_kwh > 60) {
      errors.push(`energy_charge_out_of_range:${e.cents_per_kwh}`);
      parsed.energy_charge = null;
    }
  } else if (e.type === "tou") {
    if (e.default_cents_per_kwh == null || e.default_cents_per_kwh < 1 || e.default_cents_per_kwh > 60 || !Array.isArray(e.windows) || e.windows.length === 0) {
      errors.push("tou_structure_incomplete");
      parsed.energy_charge = null;
    }
  }
  return errors;
}

async function loadEligiblePlans() {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, efl_url, plan_details ( plan_id, parse_errors, raw_text, gemini_source_url )")
    .eq("active", true)
    .not("efl_url", "is", null);
  if (error) throw error;

  const detailsOf = (p) =>
    Array.isArray(p.plan_details) ? p.plan_details[0] : p.plan_details;

  return data
    .map((p) => ({ ...p, details: detailsOf(p) }))
    .filter(
      (p) =>
        (p.details?.parse_errors?.length ?? 0) > 0 &&
        (retryFailures || p.details.gemini_source_url !== p.efl_url),
    )
    .slice(0, limit ?? Infinity);
}

async function stampSourceUrl(planId, eflUrl) {
  const { error } = await supabase
    .from("plan_details")
    .update({ gemini_source_url: eflUrl })
    .eq("plan_id", planId);
  if (error) console.warn(`  could not stamp gemini_source_url for plan ${planId}: ${error.message}`);
}

async function upsertDetails(planId, eflUrl, parsed, parseErrors, usedGemini) {
  // Deliberately omit raw_text so the Tier A/B extraction stays for debugging.
  const { error } = await supabase
    .from("plan_details")
    .update({
      parsed_at: new Date().toISOString(),
      parser_version: usedGemini ? PARSER_VERSION : "tier-c-octopus-v1",
      parser_tier: usedGemini ? PARSER_TIER : "text",
      gemini_source_url: eflUrl,
      base_charge: parsed.base_charge,
      etf_amount: parsed.etf_amount,
      minimum_usage_fee: parsed.minimum_usage_fee,
      energy_charge: parsed.energy_charge,
      bill_credits: parsed.bill_credits,
      tdu_charges: parsed.tdu_charges,
      parse_errors: parseErrors,
    })
    .eq("plan_id", planId);
  if (error) throw error;
}

async function main() {
  const eligible = await loadEligiblePlans();
  console.log(`▸ ${eligible.length} plan${eligible.length === 1 ? "" : "s"} to extract via Gemini (model=${model})`);

  let recovered = 0;
  let stillFailed = 0;
  let hardFailed = 0;
  let consecutiveRateLimits = 0;
  const failureReasons = new Map();

  for (let i = 0; i < eligible.length; i++) {
    const plan = eligible[i];
    const tag = `[${i + 1}/${eligible.length}] plan ${plan.id} (${plan.name})`;
    let usedGemini = false;
    try {
      let parsed;
      const rawText = plan.details?.raw_text?.trim();
      if (rawText && rawText.length > 200) {
        usedGemini = true;
        parsed = await callGemini([
          { text: PROMPT },
          { text: `\nEFL text:\n${rawText.slice(0, 30_000)}` },
        ]);
      } else {
        const content = await fetchEflContent(plan.efl_url);
        if (content.kind === "octopus") {
          parsed = extractOctopus(content.snapshot);
        } else {
          usedGemini = true;
          parsed = await callGemini([
            { text: PROMPT },
            content.kind === "pdf"
              ? { inlineData: { mimeType: "application/pdf", data: content.buf.toString("base64") } }
              : { text: `\nEFL text:\n${content.text.slice(0, 30_000)}` },
          ]);
        }
      }

      const errors = validate(parsed);
      await upsertDetails(plan.id, plan.efl_url, parsed, errors, usedGemini);
      consecutiveRateLimits = 0;
      if (errors.length === 0) {
        recovered++;
        console.log(`  ${tag} ✓ recovered`);
      } else {
        stillFailed++;
        console.log(`  ${tag} ◦ extracted but invalid: ${errors.join(", ")}`);
      }
    } catch (err) {
      hardFailed++;
      const reason = (err.message || String(err)).slice(0, 120);
      failureReasons.set(reason, (failureReasons.get(reason) ?? 0) + 1);
      // Stamp only on definitive, content-level failures so the nightly run
      // doesn't re-spend quota on the same URL. Transient failures — Gemini
      // rate limits / 5xx — must NOT stamp, or one quota-exhausted run
      // permanently skips every plan it touched (this happened on the first
      // backfill: 45 plans stamped off the queue by daily-quota 429s).
      const transient = /Gemini HTTP (429|5\d\d)/.test(reason);
      if (!transient) await stampSourceUrl(plan.id, plan.efl_url);
      // Three rate-limited plans in a row means the daily quota is gone, not
      // a momentary spike — stop burning retries; tomorrow's run resumes.
      if (/Gemini HTTP 429/.test(reason)) {
        if (++consecutiveRateLimits >= 3) {
          console.log("✗ daily Gemini quota exhausted — stopping; unstamped plans retry next run");
          break;
        }
      } else {
        consecutiveRateLimits = 0;
      }
    }
    // Rate-limit pause only matters when we actually called Gemini.
    if (usedGemini && i < eligible.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  console.log("");
  console.log(`✓ recovered:                ${recovered}`);
  console.log(`◦ extracted but invalid:    ${stillFailed}`);
  console.log(`✗ hard failures:            ${hardFailed}`);
  if (failureReasons.size > 0) {
    console.log("Failure reasons:");
    for (const [reason, count] of [...failureReasons.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}×  ${reason}`);
    }
  }
}

await main();
