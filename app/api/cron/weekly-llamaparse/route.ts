// Weekly cron — Tier B (LlamaParse) on plans where Tier A failed AND the
// fact_sheet URL has changed since the last LlamaParse attempt.
//
// URL-change gating prevents us from burning LlamaParse credits re-submitting
// the same broken URLs every week. A failed attempt still stamps
// llamaparse_source_url so the same URL won't be retried.

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
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

  const deadline = new Deadline(55_000);
  let status: "ok" | "partial" | "error" = "ok";
  let result: unknown = null;
  let errorMessage: string | undefined;

  try {
    result = await runLlamaParseChanged({ deadline });
    if ((result as { skipped_for_time?: number }).skipped_for_time && (result as { skipped_for_time: number }).skipped_for_time > 0) {
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
      result: result as Record<string, unknown> | null,
      error_message: errorMessage ?? null,
    })
    .eq("id", run.id);

  return NextResponse.json({ status, runId: run.id, result });
}
