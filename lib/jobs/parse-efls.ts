// Tier A EFL parser — text/regex via unpdf. Free.
// Only re-parses plans where plans.efl_url has changed since plan_details.source_url
// (or where plan_details is missing entirely).

import { extractText, getDocumentProxy } from "unpdf";
import { parseEfl } from "./efl-parse";
import { Deadline, getServiceClient, sleep } from "./supabase";

const PARSER_VERSION = "tier-a-v1";
const PARSER_TIER = "text";
const REQUEST_DELAY_MS = 150;
const FETCH_TIMEOUT_MS = 20_000;

async function fetchPdf(url: string): Promise<Uint8Array> {
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
    // PDF magic bytes: %PDF
    if (buf.length < 4 || buf[0] !== 0x25 || buf[1] !== 0x50 || buf[2] !== 0x44 || buf[3] !== 0x46) {
      throw new Error("not_a_pdf");
    }
    return buf;
  } finally {
    clearTimeout(t);
  }
}

type EligiblePlan = {
  id: number;
  efl_url: string;
};

async function loadChangedPlans(limit?: number): Promise<EligiblePlan[]> {
  const supabase = getServiceClient();
  // Pull all active plans with an EFL URL and their current source_url.
  // Filter in JS for "URL changed since last parse" — simpler than a SQL join here.
  const { data, error } = await supabase
    .from("plans")
    .select("id, efl_url, plan_details ( source_url )")
    .eq("active", true)
    .not("efl_url", "is", null);
  if (error) throw error;

  const eligible: EligiblePlan[] = [];
  for (const p of data ?? []) {
    const details = Array.isArray(p.plan_details) ? p.plan_details[0] : p.plan_details;
    const sourceUrl: string | null = details?.source_url ?? null;
    if (p.efl_url && sourceUrl !== p.efl_url) {
      eligible.push({ id: p.id, efl_url: p.efl_url });
    }
  }
  return limit != null ? eligible.slice(0, limit) : eligible;
}

export type ParseResult = {
  eligible: number;
  parsed: number;
  failed: number;
  skipped_for_time: number;
  failure_reasons: Record<string, number>;
};

export async function runParseEflsChanged(opts: {
  limit?: number;
  deadline?: Deadline;
} = {}): Promise<ParseResult> {
  const supabase = getServiceClient();
  const eligible = await loadChangedPlans(opts.limit);

  const result: ParseResult = {
    eligible: eligible.length,
    parsed: 0,
    failed: 0,
    skipped_for_time: 0,
    failure_reasons: {},
  };

  for (let i = 0; i < eligible.length; i++) {
    if (opts.deadline?.expired(5_000)) {
      result.skipped_for_time = eligible.length - i;
      break;
    }
    const plan = eligible[i];
    const nowIso = new Date().toISOString();
    try {
      const buf = await fetchPdf(plan.efl_url);
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      const parsed = parseEfl(text, { tier: "a" });
      const { error } = await supabase.from("plan_details").upsert(
        {
          plan_id: plan.id,
          parsed_at: nowIso,
          parser_version: PARSER_VERSION,
          parser_tier: PARSER_TIER,
          source_url: plan.efl_url,
          base_charge: parsed.base_charge,
          etf_amount: parsed.etf_amount,
          minimum_usage_fee: parsed.minimum_usage_fee,
          energy_charge: parsed.energy_charge,
          bill_credits: parsed.bill_credits,
          tdu_charges: parsed.tdu_charges,
          raw_text: parsed.raw_text,
          parse_errors: parsed.parse_errors,
        },
        { onConflict: "plan_id" },
      );
      if (error) throw error;
      result.parsed++;
    } catch (err) {
      result.failed++;
      const reason = err instanceof Error ? err.message : String(err);
      result.failure_reasons[reason] = (result.failure_reasons[reason] ?? 0) + 1;
      // Record the failure so Tier B can pick it up — and importantly,
      // stamp source_url so Tier A doesn't retry the same broken URL daily.
      try {
        await supabase.from("plan_details").upsert(
          {
            plan_id: plan.id,
            parsed_at: nowIso,
            parser_version: PARSER_VERSION,
            parser_tier: PARSER_TIER,
            source_url: plan.efl_url,
            base_charge: null,
            etf_amount: null,
            minimum_usage_fee: null,
            energy_charge: null,
            bill_credits: null,
            tdu_charges: null,
            raw_text: null,
            parse_errors: [`fetch_or_extract_failed:${reason}`.slice(0, 200)],
          },
          { onConflict: "plan_id" },
        );
      } catch {
        // swallow — best effort
      }
    }
    await sleep(REQUEST_DELAY_MS);
  }

  return result;
}
