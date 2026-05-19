import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { scoreAndRank } from "./score.ts";
import { readPriceHistory, toMarketContext } from "../price-history.ts";
import {
  type Filters,
  type PlanForScoring,
  type RankedPlan,
  type RateType,
  type RecommendInput,
  DEFAULT_USAGE_KWH,
} from "./types.ts";

const PTC_BASE = "https://api.powertochoose.org/api/PowerToChoose";

// PTC tags a small minority of plans as "Indexed". Editorially we treat the
// Texas retail market as Fixed vs. Variable only — indexed rates float with
// market, so we collapse them into Variable for display and scoring.
function normalizeRateType(raw: string | null): RateType | null {
  if (raw === "Fixed") return "Fixed";
  if (raw === "Variable" || raw === "Indexed") return "Variable";
  return null;
}

function getServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Top-level recommend pipeline.
 *
 * 1. Resolve ZIP → TDU(s) using the service_areas cache, falling back to a
 *    live PTC API call (results are cached on success).
 * 2. Query active plans in those TDUs, joined with parsed plan_details.
 * 3. Apply hard filters.
 * 4. Score + rank.
 */
export async function recommend(input: RecommendInput): Promise<{
  ranked: RankedPlan[];
  tduCodes: string[];
  candidateCount: number;
}> {
  const supabase = getServerClient();
  const usageKwh = input.monthlyUsageKwh ?? DEFAULT_USAGE_KWH;
  const limit = input.limit ?? 10;
  const filters = input.filters ?? {};

  // --- ZIP → TDU resolution ------------------------------------------------
  const tduIds = await resolveZipToTdus(supabase, input.zip);
  if (tduIds.length === 0) {
    return { ranked: [], tduCodes: [], candidateCount: 0 };
  }

  // --- Load candidate plans ------------------------------------------------
  const candidates = await loadCandidates(supabase, tduIds, filters);

  // --- Market context (EIA TX residential history) ------------------------
  // Loaded once per request; gracefully degrades to null when the table is
  // empty so scoring still works in fresh / test environments.
  const market = toMarketContext(await readPriceHistory("TX", "RES"));

  // --- Score + rank --------------------------------------------------------
  const ranked = scoreAndRank(
    candidates,
    usageKwh,
    input.weights ?? {},
    limit,
    market,
    input.devices ?? [],
  );

  const { data: tduRows } = await supabase
    .from("tdus")
    .select("code")
    .in("id", tduIds);

  return {
    ranked,
    tduCodes: (tduRows ?? []).map((r) => r.code),
    candidateCount: candidates.length,
  };
}

// -------------------------------------------------------------------------
// ZIP → TDU resolution
// -------------------------------------------------------------------------

async function resolveZipToTdus(supabase: SupabaseClient, zip: string): Promise<number[]> {
  // Cache hit?
  const { data: cached } = await supabase
    .from("service_areas")
    .select("tdu_id")
    .eq("zip", zip);
  if (cached && cached.length > 0) return cached.map((r) => r.tdu_id as number);

  // Cache miss — ask PTC, then backfill our cache.
  const tduIds = await fetchTdusForZipFromPtc(supabase, zip);
  for (const tduId of tduIds) {
    await supabase.from("service_areas").upsert({ zip, tdu_id: tduId });
  }
  return tduIds;
}

async function fetchTdusForZipFromPtc(
  supabase: SupabaseClient,
  zip: string,
): Promise<number[]> {
  let res: Response;
  try {
    res = await fetch(`${PTC_BASE}/plans?zip_code=${zip}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as { success?: boolean; data?: Array<{ company_tdu_id?: string; company_tdu_name?: string }> } | null;
  if (!json?.success) return [];

  const distinctPtcTduIds = Array.from(
    new Set((json.data ?? []).map((p) => p.company_tdu_id).filter(Boolean)),
  ) as string[];
  if (distinctPtcTduIds.length === 0) return [];

  const { data: tdus } = await supabase
    .from("tdus")
    .select("id, ptc_tdu_id")
    .in("ptc_tdu_id", distinctPtcTduIds);
  return (tdus ?? []).map((t) => t.id as number);
}

// -------------------------------------------------------------------------
// Candidate loading
// -------------------------------------------------------------------------

async function loadCandidates(
  supabase: SupabaseClient,
  tduIds: number[],
  filters: Filters,
): Promise<PlanForScoring[]> {
  // Pull plans + joined rep + parsed details. Apply most filters in SQL so
  // we only pay the network/decode cost on actual candidates.
  let query = supabase
    .from("plans")
    .select(`
      id, ptc_id, name, rep_id, tdu_id,
      rate_type, term_months, prepaid, renewable_pct,
      time_of_use, simple_plan, new_customer_only, has_minimum_usage_fee,
      rate_500_kwh, rate_1000_kwh, rate_2000_kwh,
      efl_url, tos_url, yrac_url, enroll_url,
      reps!inner ( id, name, logo_url ),
      tdus!inner ( id, code ),
      plan_details ( base_charge, etf_amount, minimum_usage_fee, energy_charge, tdu_charges, bill_credits )
    `)
    .eq("active", true)
    .in("tdu_id", tduIds);

  if (filters.rateType) query = query.eq("rate_type", filters.rateType);
  if (filters.minRenewablePct != null) query = query.gte("renewable_pct", filters.minRenewablePct);
  if (filters.maxTermMonths != null) query = query.lte("term_months", filters.maxTermMonths);
  if (filters.prepaidOnly === true) query = query.eq("prepaid", true);
  if (filters.excludePrepaid === true) query = query.eq("prepaid", false);
  if (filters.timeOfUseOnly === true) query = query.eq("time_of_use", true);
  if (filters.excludeTimeOfUse === true) query = query.eq("time_of_use", false);
  if (filters.providerIds && filters.providerIds.length > 0) {
    query = query.in("rep_id", filters.providerIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  let candidates = (data ?? []).map(rowToPlan);

  // Filters that look at joined plan_details fields run in JS — Supabase's
  // builder doesn't OR-with-NULL on related tables cleanly, and we want to
  // include plans with unparsed details (benefit of the doubt).
  if (filters.maxBaseCharge != null) {
    const cap = filters.maxBaseCharge;
    candidates = candidates.filter((p) => p.base_charge == null || p.base_charge <= cap);
  }
  if (filters.maxEtf != null) {
    const cap = filters.maxEtf;
    candidates = candidates.filter((p) => p.etf_amount == null || p.etf_amount <= cap);
  }

  return candidates;
}

function rowToPlan(row: Record<string, unknown>): PlanForScoring {
  const rep = (row.reps as { id: number; name: string; logo_url?: string | null } | null) ?? { id: 0, name: "", logo_url: null };
  const tdu = (row.tdus as { id: number; code: string } | null) ?? { id: 0, code: "" };
  // Supabase returns 1:1 relations as objects, 1:many as arrays. plan_details
  // is 1:1 (plan_id is both FK and PK), so it comes back as an object — handle
  // both shapes defensively.
  const rawDetails = row.plan_details as Record<string, unknown> | Array<Record<string, unknown>> | null;
  const details: Record<string, unknown> = Array.isArray(rawDetails)
    ? (rawDetails[0] ?? {})
    : (rawDetails ?? {});

  return {
    id: row.id as number,
    ptc_id: row.ptc_id as string,
    name: row.name as string,
    rep_id: rep.id,
    rep_name: rep.name,
    rep_logo_url: rep.logo_url ?? null,
    tdu_id: tdu.id,
    tdu_code: tdu.code,
    rate_type: normalizeRateType(row.rate_type as string | null),
    term_months: (row.term_months as number | null) ?? null,
    prepaid: Boolean(row.prepaid),
    time_of_use: Boolean(row.time_of_use),
    simple_plan: Boolean(row.simple_plan),
    new_customer_only: Boolean(row.new_customer_only),
    has_minimum_usage_fee: Boolean(row.has_minimum_usage_fee),
    renewable_pct: (row.renewable_pct as number | null) ?? null,
    rate_500_kwh: parseNum(row.rate_500_kwh),
    rate_1000_kwh: parseNum(row.rate_1000_kwh),
    rate_2000_kwh: parseNum(row.rate_2000_kwh),
    efl_url: (row.efl_url as string | null) ?? null,
    tos_url: (row.tos_url as string | null) ?? null,
    yrac_url: (row.yrac_url as string | null) ?? null,
    enroll_url: (row.enroll_url as string | null) ?? null,
    base_charge: parseNum(details.base_charge),
    etf_amount: parseNum(details.etf_amount),
    minimum_usage_fee: parseNum(details.minimum_usage_fee),
    energy_charge: (details.energy_charge as PlanForScoring["energy_charge"]) ?? null,
    tdu_charges: (details.tdu_charges as PlanForScoring["tdu_charges"]) ?? null,
    bill_credits: (details.bill_credits as PlanForScoring["bill_credits"]) ?? null,
  };
}

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}
