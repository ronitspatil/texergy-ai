// Power to Choose plans ingestion (server-callable port of scripts/ingest-plans.mjs).
// Hits one ZIP per TDU, upserts reps + plans, soft-deletes anything not seen,
// writes an ingest_runs audit row.

import { getServiceClient, type Deadline } from "./supabase";

const REPRESENTATIVE_ZIPS: Record<string, string> = {
  ONCOR: "75201",
  CENTERPOINT: "77002",
  AEP_CENTRAL: "78364",
  AEP_NORTH: "79601",
  TNMP: "79735",
};

const PTC_BASE = "https://api.powertochoose.org/api/PowerToChoose";

type PtcPlan = {
  plan_id: string | number;
  company_id: string;
  company_name: string;
  company_logo?: string | null;
  company_tdu_id?: string | null;
  company_tdu_name?: string | null;
  website?: string | null;
  enroll_phone?: string | null;
  plan_name: string;
  rate_type?: string | null;
  plan_type?: string | number | null;
  term_value?: string | number | null;
  prepaid?: boolean;
  prepaid_url?: string | null;
  new_customer?: boolean;
  timeofuse?: boolean;
  simple_plan?: boolean;
  minimum_usage?: boolean;
  renewable_energy_id?: string | number | null;
  price_kwh500?: string | number | null;
  price_kwh1000?: string | number | null;
  price_kwh2000?: string | number | null;
  fact_sheet?: string | null;
  terms_of_service?: string | null;
  yrac_url?: string | null;
  go_to_plan?: string | null;
  special_terms?: string | null;
  pricing_details?: string | null;
  promotions?: string | null;
};

export type IngestCounts = {
  plans_seen: number;
  plans_inserted: number;
  plans_updated: number;
  plans_deactivated: number;
  tdus_processed: string[];
  tdus_failed: string[];
};

function slugify(s: string): string {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function parsePrice(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseInt0(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function ptcTduNameToCode(name?: string | null): string | null {
  if (!name) return null;
  const u = name.toUpperCase();
  if (u.includes("ONCOR")) return "ONCOR";
  if (u.includes("CENTERPOINT") || u.includes("CENTER POINT")) return "CENTERPOINT";
  if (u.includes("AEP") && u.includes("CENTRAL")) return "AEP_CENTRAL";
  if (u.includes("AEP") && u.includes("NORTH")) return "AEP_NORTH";
  if (u.includes("TNMP") || u.includes("TEXAS-NEW MEXICO") || u.includes("TEXAS NEW MEXICO")) return "TNMP";
  return null;
}

async function fetchPlansForZip(zip: string): Promise<PtcPlan[]> {
  const res = await fetch(`${PTC_BASE}/plans?zip_code=${zip}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`PTC API ${res.status} for ZIP ${zip}`);
  const json = (await res.json()) as { success: boolean; data?: PtcPlan[] };
  if (!json.success) throw new Error(`PTC API success=false for ZIP ${zip}`);
  return json.data ?? [];
}

export async function runIngestPlans(opts: {
  tdus?: string[];
  deadline?: Deadline;
} = {}): Promise<{ runId: number; counts: IngestCounts; status: "ok" | "partial" | "error"; error?: string }> {
  const supabase = getServiceClient();
  const targets = Object.entries(REPRESENTATIVE_ZIPS).filter(
    ([code]) => !opts.tdus || opts.tdus.length === 0 || opts.tdus.includes(code),
  );

  // 1. Start audit row.
  const { data: run, error: startErr } = await supabase
    .from("ingest_runs")
    .insert({ source: "ptc_api", status: "running" })
    .select()
    .single();
  if (startErr || !run) throw startErr ?? new Error("could not start ingest run");

  const counts: IngestCounts = {
    plans_seen: 0,
    plans_inserted: 0,
    plans_updated: 0,
    plans_deactivated: 0,
    tdus_processed: [],
    tdus_failed: [],
  };

  // REP cache: ptc_company_id → { id }
  const repCache = new Map<string, { id: number }>();

  async function upsertRep(plan: PtcPlan): Promise<{ id: number }> {
    const ptcCompanyId = plan.company_id;
    const cached = repCache.get(ptcCompanyId);
    if (cached) return cached;

    const { data: existing, error: lookupErr } = await supabase
      .from("reps")
      .select("id")
      .eq("ptc_company_id", ptcCompanyId)
      .maybeSingle();
    if (lookupErr) throw lookupErr;

    if (existing) {
      await supabase
        .from("reps")
        .update({
          name: plan.company_name,
          logo_url: plan.company_logo ?? null,
          phone: plan.enroll_phone ?? null,
          website_url: plan.website ?? null,
        })
        .eq("id", existing.id);
      repCache.set(ptcCompanyId, { id: existing.id });
      return { id: existing.id };
    }

    const baseSlug = slugify(plan.company_name);
    for (const slug of [baseSlug, `${baseSlug}-${ptcCompanyId.slice(-6).toLowerCase()}`]) {
      const { data, error } = await supabase
        .from("reps")
        .insert({
          name: plan.company_name,
          slug,
          ptc_company_id: ptcCompanyId,
          logo_url: plan.company_logo ?? null,
          phone: plan.enroll_phone ?? null,
          website_url: plan.website ?? null,
        })
        .select("id")
        .single();
      if (!error && data) {
        repCache.set(ptcCompanyId, { id: data.id });
        return { id: data.id };
      }
      // 23505 = unique violation on slug — try next candidate.
      if (error && (error as { code?: string }).code !== "23505") throw error;
    }
    throw new Error(`could not insert REP ${plan.company_name} (${ptcCompanyId})`);
  }

  async function upsertPlan(plan: PtcPlan, repId: number, tduId: number, runStartedAt: string): Promise<"inserted" | "updated"> {
    const ptcId = String(plan.plan_id);
    const row = {
      ptc_id: ptcId,
      rep_id: repId,
      tdu_id: tduId,
      name: plan.plan_name,
      rate_type: plan.rate_type ?? null,
      plan_type_code: parseInt0(plan.plan_type),
      term_months: parseInt0(plan.term_value),
      prepaid: Boolean(plan.prepaid),
      prepaid_url: plan.prepaid_url ?? null,
      new_customer_only: Boolean(plan.new_customer),
      time_of_use: Boolean(plan.timeofuse),
      simple_plan: Boolean(plan.simple_plan),
      has_minimum_usage_fee: Boolean(plan.minimum_usage),
      renewable_pct: parseInt0(plan.renewable_energy_id),
      rate_500_kwh: parsePrice(plan.price_kwh500),
      rate_1000_kwh: parsePrice(plan.price_kwh1000),
      rate_2000_kwh: parsePrice(plan.price_kwh2000),
      efl_url: plan.fact_sheet ?? null,
      tos_url: plan.terms_of_service ?? null,
      yrac_url: plan.yrac_url ?? null,
      enroll_url: plan.go_to_plan ?? null,
      special_terms: plan.special_terms ?? null,
      pricing_details_raw: plan.pricing_details ?? null,
      promotions: plan.promotions ?? null,
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

  try {
    const { data: tdus, error: tduErr } = await supabase
      .from("tdus")
      .select("id, code, name, ptc_tdu_id");
    if (tduErr) throw tduErr;
    const tduByCode = Object.fromEntries((tdus ?? []).map((t) => [t.code, t]));
    const successfulTduIds: number[] = [];

    for (const [code, zip] of targets) {
      if (opts.deadline?.expired(3_000)) {
        // No time to safely deactivate; flag partial and bail.
        break;
      }
      const tdu = tduByCode[code];
      if (!tdu) {
        counts.tdus_failed.push(code);
        continue;
      }

      let plans: PtcPlan[];
      try {
        plans = await fetchPlansForZip(zip);
      } catch {
        counts.tdus_failed.push(code);
        continue;
      }

      successfulTduIds.push(tdu.id);
      counts.tdus_processed.push(code);
      await supabase.from("service_areas").upsert({ zip, tdu_id: tdu.id });

      if (!tdu.ptc_tdu_id && plans.length > 0 && plans[0].company_tdu_id) {
        const mapped = ptcTduNameToCode(plans[0].company_tdu_name);
        if (mapped === code) {
          await supabase.from("tdus").update({ ptc_tdu_id: plans[0].company_tdu_id }).eq("id", tdu.id);
        }
      }

      let aborted = false;
      for (const plan of plans) {
        // Yield to the deadline mid-TDU. Without this, a single TDU's plan
        // list (hundreds of upserts) can blow past the budget and starve
        // the cleanup / bookkeeping phase that follows ingest.
        if (opts.deadline?.expired(2_000)) {
          aborted = true;
          break;
        }
        counts.plans_seen++;
        const planTduCode = ptcTduNameToCode(plan.company_tdu_name);
        if (planTduCode !== code) continue; // mis-attributed plan (ZIP straddles TDUs); skip.

        const rep = await upsertRep(plan);
        const result = await upsertPlan(plan, rep.id, tdu.id, run.started_at);
        if (result === "inserted") counts.plans_inserted++;
        else counts.plans_updated++;
      }
      if (aborted) break;
    }

    // Soft-delete plans within successful TDUs that we didn't see this run.
    if (successfulTduIds.length > 0) {
      const { data: deactivated, error: deactErr } = await supabase
        .from("plans")
        .update({ active: false })
        .in("tdu_id", successfulTduIds)
        .lt("last_seen_at", run.started_at)
        .eq("active", true)
        .select("id");
      if (deactErr) throw deactErr;
      counts.plans_deactivated = deactivated?.length ?? 0;
    }

    const status: "ok" | "partial" = counts.tdus_failed.length === 0 ? "ok" : "partial";
    await supabase
      .from("ingest_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "ok",
        plans_seen: counts.plans_seen,
        plans_inserted: counts.plans_inserted,
        plans_updated: counts.plans_updated,
        plans_deactivated: counts.plans_deactivated,
      })
      .eq("id", run.id);

    return { runId: run.id, counts, status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("ingest_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "error",
        plans_seen: counts.plans_seen,
        plans_inserted: counts.plans_inserted,
        plans_updated: counts.plans_updated,
        plans_deactivated: counts.plans_deactivated,
        error_message: msg,
      })
      .eq("id", run.id);
    return { runId: run.id, counts, status: "error", error: msg };
  }
}
