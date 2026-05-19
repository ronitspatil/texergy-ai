// Tier B EFL parser — LlamaParse (paid). Used for plans where Tier A regex
// failed AND the EFL URL has changed since the last LlamaParse attempt.
// This is the key cost-saver: we don't re-submit the same broken URL weekly.

import { parseEfl } from "./efl-parse";
import { Deadline, getServiceClient, sleep } from "./supabase";

const PARSER_VERSION = "tier-b-llamaparse-v1";
const PARSER_TIER = "vision";
const LLAMA_BASE = "https://api.cloud.llamaindex.ai/api/v2/parse";
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;
const JOB_DELAY_MS = 200;

type EligiblePlan = {
  id: number;
  efl_url: string;
};

async function submitJob(eflUrl: string, key: string, tier: string): Promise<string> {
  const res = await fetch(LLAMA_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source_url: eflUrl, tier, version: "latest" }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LlamaParse submit HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

async function fetchResult(jobId: string, key: string, deadlineMs: number): Promise<string> {
  const localDeadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < Math.min(localDeadline, deadlineMs)) {
    const res = await fetch(`${LLAMA_BASE}/${jobId}?expand=markdown`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    const json = (await res.json()) as {
      job?: { status?: string };
      markdown?: { pages?: { markdown?: string }[] };
    };
    const status = json?.job?.status;
    if (status === "COMPLETED") {
      const pages = json?.markdown?.pages ?? [];
      return pages.map((p) => p.markdown ?? "").join("\n");
    }
    if (status === "FAILED" || status === "CANCELLED") {
      throw new Error(`LlamaParse job ${status}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error("LlamaParse poll timeout");
}

async function loadEligiblePlans(limit?: number): Promise<EligiblePlan[]> {
  const supabase = getServiceClient();
  // Plans where Tier A wrote parse_errors AND the URL has changed since
  // the last LlamaParse attempt (or LlamaParse has never been tried).
  const { data, error } = await supabase
    .from("plans")
    .select("id, efl_url, plan_details ( parse_errors, llamaparse_source_url )")
    .eq("active", true)
    .not("efl_url", "is", null);
  if (error) throw error;

  const eligible: EligiblePlan[] = [];
  for (const p of data ?? []) {
    const details = Array.isArray(p.plan_details) ? p.plan_details[0] : p.plan_details;
    if (!details) continue;
    const hasErrors = (details.parse_errors?.length ?? 0) > 0;
    const llamaUrl: string | null = details.llamaparse_source_url ?? null;
    if (hasErrors && p.efl_url && llamaUrl !== p.efl_url) {
      eligible.push({ id: p.id, efl_url: p.efl_url });
    }
  }
  return limit != null ? eligible.slice(0, limit) : eligible;
}

export type LlamaParseResult = {
  eligible: number;
  recovered: number;
  still_failed: number;
  llama_failed: number;
  skipped_for_time: number;
  failure_reasons: Record<string, number>;
};

export async function runLlamaParseChanged(opts: {
  limit?: number;
  tier?: "cost_effective" | "agentic_plus";
  deadline?: Deadline;
} = {}): Promise<LlamaParseResult> {
  const key = process.env.LLAMA_CLOUD_API_KEY;
  if (!key) throw new Error("Missing LLAMA_CLOUD_API_KEY");
  const tier = opts.tier ?? "cost_effective";
  const supabase = getServiceClient();

  const eligible = await loadEligiblePlans(opts.limit);
  const result: LlamaParseResult = {
    eligible: eligible.length,
    recovered: 0,
    still_failed: 0,
    llama_failed: 0,
    skipped_for_time: 0,
    failure_reasons: {},
  };

  for (let i = 0; i < eligible.length; i++) {
    if (opts.deadline?.expired(10_000)) {
      result.skipped_for_time = eligible.length - i;
      break;
    }
    const plan = eligible[i];
    const nowIso = new Date().toISOString();
    const callDeadlineMs = opts.deadline
      ? Date.now() + Math.min(POLL_TIMEOUT_MS, opts.deadline.remainingMs() - 5_000)
      : Date.now() + POLL_TIMEOUT_MS;
    try {
      const jobId = await submitJob(plan.efl_url, key, tier);
      const markdown = await fetchResult(jobId, key, callDeadlineMs);
      const parsed = parseEfl(markdown, { tier: "b" });

      const { error } = await supabase.from("plan_details").upsert(
        {
          plan_id: plan.id,
          parsed_at: nowIso,
          parser_version: PARSER_VERSION,
          parser_tier: PARSER_TIER,
          llamaparse_source_url: plan.efl_url,
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
      if (parsed.energy_charge) result.recovered++;
      else result.still_failed++;
    } catch (err) {
      result.llama_failed++;
      const reason = (err instanceof Error ? err.message : String(err)).slice(0, 120);
      result.failure_reasons[reason] = (result.failure_reasons[reason] ?? 0) + 1;
      // Stamp llamaparse_source_url even on hard failure — don't retry same URL.
      try {
        await supabase
          .from("plan_details")
          .update({ llamaparse_source_url: plan.efl_url })
          .eq("plan_id", plan.id);
      } catch {
        // swallow — best effort
      }
    }
    await sleep(JOB_DELAY_MS);
  }

  return result;
}
