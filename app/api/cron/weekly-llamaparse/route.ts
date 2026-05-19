// Weekly cron — runs Tier-A EFL parsing on plans with changed URLs, then
// Tier B (LlamaParse) on whatever Tier A couldn't extract. Lives on the
// weekly schedule because the daily cron's 60s Hobby budget is consumed by
// ingest, and parsing isn't time-critical (plan terms don't move fast).
//
// URL-change gating prevents us from burning LlamaParse credits re-submitting
// the same broken URLs every week. A failed attempt still stamps
// llamaparse_source_url so the same URL won't be retried.

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runParseEflsChanged } from "@/lib/jobs/parse-efls";
import { runLlamaParseChanged } from "@/lib/jobs/parse-efls-llamaparse";
import { Deadline, getServiceClient } from "@/lib/jobs/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!process.env.LLAMA_CLOUD_API_KEY) {
    return NextResponse.json({ error: "LLAMA_CLOUD_API_KEY not configured" }, { status: 500 });
  }

  const supabase = getServiceClient();
  const { data: run, error: runErr } = await supabase
    .from("cron_runs")
    .insert({ job: "weekly_llamaparse", status: "running" })
    .select()
    .single();
  if (runErr) {
    return NextResponse.json({ error: "could not create cron_runs row", detail: runErr.message }, { status: 500 });
  }

  // 45s leaves 15s for bookkeeping + Vercel's own shutdown overhead.
  const deadline = new Deadline(45_000);
  const result: Record<string, unknown> = {};
  let status: "ok" | "partial" | "error" = "ok";
  let errorMessage: string | undefined;

  async function checkpoint() {
    await supabase.from("cron_runs").update({ status, result }).eq("id", run.id);
  }

  try {
    // 1. Tier A first — fast in-process parser. Skips plans Tier A already
    //    handled OR whose URL hasn't changed since the last attempt.
    const tierA = await runParseEflsChanged({ deadline });
    result.tier_a = tierA;
    if (tierA.skipped_for_time > 0) status = "partial";
    await checkpoint();

    // 2. Tier B — LlamaParse on plans Tier A couldn't extract. Whatever
    //    remains of the budget. This is the credit-burning step so any
    //    saved time goes here.
    if (!deadline.expired(5_000)) {
      const tierB = await runLlamaParseChanged({ deadline });
      result.tier_b = tierB;
      if ((tierB as { skipped_for_time?: number }).skipped_for_time && (tierB as { skipped_for_time: number }).skipped_for_time > 0) {
        status = "partial";
      }
    } else {
      result.tier_b = { skipped: "deadline_exceeded" };
      status = "partial";
    }
  } catch (err) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  await supabase
    .from("cron_runs")
    .update({
      finished_at: new Date().toISOString(),
      status,
      result,
      error_message: errorMessage ?? null,
    })
    .eq("id", run.id);

  return NextResponse.json({ status, runId: run.id, ...result });
}
