// Daily cron — ingest plans from Power to Choose, snapshot per-TDU pricing,
// and re-parse EFLs whose fact_sheet URL changed since the last parse.
//
// Time budget: we cap at ~55s to stay under Vercel Hobby's 60s function
// timeout. Each step is given a slice; if the Tier A parse phase runs out
// of budget, it returns early and the rest are picked up tomorrow (changed
// URLs are rare after the initial backfill).
//
// Vercel cron requests carry `Authorization: Bearer ${CRON_SECRET}`; we
// verify that before doing any work. Manual triggers (curl) work the same.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runIngestPlans } from "@/lib/jobs/ingest-plans";
import { runSnapshotPrices } from "@/lib/jobs/snapshot-prices";
import { Deadline, getServiceClient } from "@/lib/jobs/supabase";

// Footer directory pages that depend on ingested plans/reps/tdus. Switched
// from force-dynamic to ISR; we revalidate them after a successful ingest.
const REVALIDATE_PATHS = ["/electricity-providers", "/electric-utilities"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Hobby caps at 60s; bump if you upgrade to Pro (300s).
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const supabase = getServiceClient();
  const { data: run, error: runErr } = await supabase
    .from("cron_runs")
    .insert({ job: "daily", status: "running" })
    .select()
    .single();
  if (runErr) {
    return NextResponse.json({ error: "could not create cron_runs row", detail: runErr.message }, { status: 500 });
  }

  // 45s leaves 15s for bookkeeping + Vercel's own shutdown overhead, which
  // matters on the Hobby tier where the function is hard-killed at 60s.
  const overall = new Deadline(45_000);
  const result: Record<string, unknown> = {};
  let status: "ok" | "partial" | "error" = "ok";
  let errorMessage: string | undefined;

  // Write partial state after each phase so that if the function later gets
  // hard-killed we still know which step finished.
  async function checkpoint() {
    await supabase
      .from("cron_runs")
      .update({ status, result })
      .eq("id", run.id);
  }

  try {
    // 1. Ingest — bulk of the time on a normal day.
    const ingest = await runIngestPlans({ deadline: overall });
    result.ingest = ingest;
    if (ingest.status !== "ok") status = "partial";

    // Revalidate the footer directory pages so they pick up new plan/rep
    // counts. Cheap (just marks the cache stale); the next visit re-renders.
    if (ingest.status !== "error") {
      for (const path of REVALIDATE_PATHS) revalidatePath(path);
      result.revalidated = REVALIDATE_PATHS;
    }
    await checkpoint();

    // 2. Snapshot — fast, runs even if budget is tight.
    if (!overall.expired(500)) {
      result.snapshot = await runSnapshotPrices();
    } else {
      result.snapshot = { skipped: "deadline_exceeded" };
      status = "partial";
    }
    await checkpoint();

    // EFL parsing (Tier A) lives on the weekly cron now. On Hobby's 60s
    // budget, daily ingest consumes the whole window, and the daily parse
    // phase was never actually getting to run.
  } catch (err) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
    result.error = errorMessage;
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
