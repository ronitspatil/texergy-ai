#!/usr/bin/env node
/**
 * Power to Choose plans ingestion.
 *
 * One API call per TDU using a representative ZIP. Upserts REPs and plans;
 * soft-deletes (active=false) anything we didn't see this run inside the TDUs
 * we successfully queried. Logs everything to ingest_runs.
 *
 *   node scripts/ingest-plans.mjs           # ingest all five TDUs
 *   node scripts/ingest-plans.mjs ONCOR     # ingest a subset (for debugging)
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// One representative ZIP per TDU. PTC's `/plans` endpoint is ZIP-scoped, but
// every ZIP in a TDU's territory returns the same set of plans, so 5 calls
// cover the whole state.
const REPRESENTATIVE_ZIPS = {
  ONCOR:       "75201", // downtown Dallas
  CENTERPOINT: "77002", // downtown Houston
  AEP_CENTRAL: "78364", // Corpus Christi area (user-verified)
  AEP_NORTH:   "79601", // Abilene
  TNMP:        "79735", // Fort Stockton (verified pure TNMP territory)
};

const PTC_BASE = "https://api.powertochoose.org/api/PowerToChoose";

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function parsePrice(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseInt0(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

// PTC reports TDU names in upper-case with slight variations. Map them to our
// canonical code so we can join to the `tdus` table seeded in 0002_plans_schema.
function ptcTduNameToCode(name) {
  if (!name) return null;
  const u = name.toUpperCase();
  if (u.includes("ONCOR")) return "ONCOR";
  if (u.includes("CENTERPOINT") || u.includes("CENTER POINT")) return "CENTERPOINT";
  if (u.includes("AEP") && u.includes("CENTRAL")) return "AEP_CENTRAL";
  if (u.includes("AEP") && u.includes("NORTH")) return "AEP_NORTH";
  if (u.includes("TNMP") || u.includes("TEXAS-NEW MEXICO") || u.includes("TEXAS NEW MEXICO")) return "TNMP";
  return null;
}

async function fetchPlansForZip(zip) {
  const res = await fetch(`${PTC_BASE}/plans?zip_code=${zip}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`PTC API ${res.status} for ZIP ${zip}`);
  const json = await res.json();
  if (!json.success) throw new Error(`PTC API success=false for ZIP ${zip}`);
  return json.data || [];
}

async function startRun() {
  const { data, error } = await supabase
    .from("ingest_runs")
    .insert({ source: "ptc_api", status: "running" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function finishRun(runId, status, counts, errorMsg) {
  const { error } = await supabase
    .from("ingest_runs")
    .update({
      finished_at: new Date().toISOString(),
      status,
      plans_seen: counts.plans_seen,
      plans_inserted: counts.plans_inserted,
      plans_updated: counts.plans_updated,
      plans_deactivated: counts.plans_deactivated,
      error_message: errorMsg ?? null,
    })
    .eq("id", runId);
  if (error) console.error("failed to finalize ingest_run:", error.message);
}

async function loadTdus() {
  const { data, error } = await supabase.from("tdus").select("id, code, name, ptc_tdu_id");
  if (error) throw error;
  return data;
}

// REP cache: ptc_company_id → { id, slug }. Avoids a DB round-trip per plan
// once we've seen the REP once this run.
const repCache = new Map();

async function upsertRep(plan) {
  const ptcCompanyId = plan.company_id;
  if (repCache.has(ptcCompanyId)) return repCache.get(ptcCompanyId);

  const { data: existing, error: lookupErr } = await supabase
    .from("reps")
    .select("id, slug")
    .eq("ptc_company_id", ptcCompanyId)
    .maybeSingle();
  if (lookupErr) throw lookupErr;

  if (existing) {
    // Refresh in case logo/website/phone changed.
    await supabase
      .from("reps")
      .update({
        name: plan.company_name,
        logo_url: plan.company_logo || null,
        phone: plan.enroll_phone || null,
        website_url: plan.website || null,
      })
      .eq("id", existing.id);
    repCache.set(ptcCompanyId, existing);
    return existing;
  }

  // Insert with a unique slug. If the slug collides (rare — two REPs with
  // identical names), append a short suffix from the ptc_company_id.
  const baseSlug = slugify(plan.company_name);
  for (const slug of [baseSlug, `${baseSlug}-${ptcCompanyId.slice(-6).toLowerCase()}`]) {
    const { data, error } = await supabase
      .from("reps")
      .insert({
        name: plan.company_name,
        slug,
        ptc_company_id: ptcCompanyId,
        logo_url: plan.company_logo || null,
        phone: plan.enroll_phone || null,
        website_url: plan.website || null,
      })
      .select("id, slug")
      .single();
    if (!error) {
      repCache.set(ptcCompanyId, data);
      return data;
    }
    if (error.code !== "23505") throw error; // not a unique violation → real error
  }
  throw new Error(`could not insert REP ${plan.company_name} (${ptcCompanyId})`);
}

// Returns "inserted" | "updated".
async function upsertPlan(plan, repId, tduId, runStartedAt) {
  const ptcId = String(plan.plan_id);
  const row = {
    ptc_id: ptcId,
    rep_id: repId,
    tdu_id: tduId,
    name: plan.plan_name,
    rate_type: plan.rate_type || null,
    plan_type_code: parseInt0(plan.plan_type),
    term_months: parseInt0(plan.term_value),
    prepaid: Boolean(plan.prepaid),
    prepaid_url: plan.prepaid_url || null,
    new_customer_only: Boolean(plan.new_customer),
    time_of_use: Boolean(plan.timeofuse),
    simple_plan: Boolean(plan.simple_plan),
    has_minimum_usage_fee: Boolean(plan.minimum_usage),
    renewable_pct: parseInt0(plan.renewable_energy_id),
    rate_500_kwh: parsePrice(plan.price_kwh500),
    rate_1000_kwh: parsePrice(plan.price_kwh1000),
    rate_2000_kwh: parsePrice(plan.price_kwh2000),
    efl_url: plan.fact_sheet || null,
    tos_url: plan.terms_of_service || null,
    yrac_url: plan.yrac_url || null,
    enroll_url: plan.go_to_plan || null,
    special_terms: plan.special_terms || null,
    pricing_details_raw: plan.pricing_details || null,
    promotions: plan.promotions || null,
    active: true,
    last_seen_at: runStartedAt,
  };

  const { data: existing, error: lookupErr } = await supabase
    .from("plans")
    .select("id")
    .eq("ptc_id", ptcId)
    .maybeSingle();
  if (lookupErr) throw lookupErr;

  if (existing) {
    const { error } = await supabase.from("plans").update(row).eq("id", existing.id);
    if (error) throw error;
    return "updated";
  }
  const { error } = await supabase.from("plans").insert(row);
  if (error) throw error;
  return "inserted";
}

async function recordServiceArea(zip, tduId) {
  await supabase.from("service_areas").upsert({ zip, tdu_id: tduId });
}

async function backfillTduPtcId(tduId, ptcTduId) {
  await supabase.from("tdus").update({ ptc_tdu_id: ptcTduId }).eq("id", tduId);
}

async function deactivateMissingPlans(tduIds, runStartedAt) {
  if (tduIds.length === 0) return 0;
  const { data, error } = await supabase
    .from("plans")
    .update({ active: false })
    .in("tdu_id", tduIds)
    .lt("last_seen_at", runStartedAt)
    .eq("active", true)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

async function main() {
  // Optional CLI filter: `node scripts/ingest-plans.mjs ONCOR AEP_NORTH`
  const codeFilter = new Set(process.argv.slice(2).map((s) => s.toUpperCase()));
  const targets = Object.entries(REPRESENTATIVE_ZIPS).filter(
    ([code]) => codeFilter.size === 0 || codeFilter.has(code),
  );

  const run = await startRun();
  console.log(`▸ ingest run #${run.id} started at ${run.started_at}`);
  const counts = { plans_seen: 0, plans_inserted: 0, plans_updated: 0, plans_deactivated: 0 };

  try {
    const tdus = await loadTdus();
    const tduByCode = Object.fromEntries(tdus.map((t) => [t.code, t]));
    const successfulTduIds = [];

    for (const [code, zip] of targets) {
      const tdu = tduByCode[code];
      if (!tdu) {
        console.warn(`  skip ${code}: no row in tdus table`);
        continue;
      }

      console.log(`▸ ${code} via ZIP ${zip}…`);
      let plans;
      try {
        plans = await fetchPlansForZip(zip);
      } catch (err) {
        console.error(`  ${code} fetch failed: ${err.message} (continuing)`);
        continue;
      }
      console.log(`    ${plans.length} plans returned`);

      successfulTduIds.push(tdu.id);
      await recordServiceArea(zip, tdu.id);

      // Backfill ptc_tdu_id on the first run, only if the API's TDU name
      // unambiguously maps to this loop's code.
      if (!tdu.ptc_tdu_id && plans.length > 0 && plans[0].company_tdu_id) {
        const mapped = ptcTduNameToCode(plans[0].company_tdu_name);
        if (mapped === code) {
          await backfillTduPtcId(tdu.id, plans[0].company_tdu_id);
          console.log(`    backfilled ptc_tdu_id`);
        }
      }

      for (const plan of plans) {
        counts.plans_seen++;

        // Sanity: plan's TDU should match this loop's TDU. If a ZIP straddles
        // two TDUs, PTC may return plans for both — skip mismatches so we don't
        // mis-attribute plans to the wrong TDU.
        const planTduCode = ptcTduNameToCode(plan.company_tdu_name);
        if (planTduCode !== code) {
          console.warn(`    plan ${plan.plan_id} tdu mismatch (got ${planTduCode || "?"}); skipping`);
          continue;
        }

        const rep = await upsertRep(plan);
        const result = await upsertPlan(plan, rep.id, tdu.id, run.started_at);
        if (result === "inserted") counts.plans_inserted++;
        else counts.plans_updated++;
      }
    }

    counts.plans_deactivated = await deactivateMissingPlans(successfulTduIds, run.started_at);

    await finishRun(run.id, "ok", counts);
    console.log("✓ done");
    console.log(JSON.stringify(counts, null, 2));

    // Bust the ISR cache on data-driven public pages so the new plan counts
    // show up immediately instead of waiting for the 24h fallback. Skips
    // silently if SITE_URL or ADMIN_TOKEN aren't set (local-only run).
    const siteUrl = process.env.SITE_URL ?? "https://texergy.ai";
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken) {
      try {
        const r = await fetch(`${siteUrl}/api/admin/revalidate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (r.ok) {
          console.log(`↻ revalidated ${siteUrl} (status ${r.status})`);
        } else {
          console.warn(`↻ revalidate failed: HTTP ${r.status}`);
        }
      } catch (e) {
        console.warn(`↻ revalidate error: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("✗ ingest failed:", err.message);
    await finishRun(run.id, "error", counts, err.message);
    process.exit(1);
  }
}

await main();
