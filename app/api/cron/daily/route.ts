// Daily cron — capture the per-TDU price snapshot. This is the historical
// time-series the seasonal/weatherForecast ranking axis and the
// trend-analysis dashboards depend on, so it MUST run every day even if
// other work is missed.
//
// Plan ingestion (PTC → reps/plans/tdus tables) used to run here too but
// was prone to hanging long enough to kill the function before any work
// committed. It now lives off-cron — run `node scripts/ingest-plans.mjs`
// from a workstation when you want fresh plan data. The snapshot below
// reads from whatever is currently in `plans`, so the snapshot will
// always succeed and reflect the latest ingest the user has done.
//
// EFL parsing (Tier A + Tier B / LlamaParse) lives on the separate weekly
// cron at /api/cron/weekly-llamaparse.
//
// Vercel cron requests carry `Authorization: Bearer ${CRON_SECRET}`; we
// verify that before doing any work. Manual triggers (curl) work the same.

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runSnapshotPrices } from "@/lib/jobs/snapshot-prices";
import { getServiceClient } from "@/lib/jobs/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Snapshot is a single read + single upsert; we don't need the full 60s.
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
    return NextResponse.json(
      { error: "could not create cron_runs row", detail: runErr.message },
      { status: 500 },
    );
  }

  const result: Record<string, unknown> = {};
  let status: "ok" | "error" = "ok";
  let errorMessage: string | undefined;

  try {
    result.snapshot = await runSnapshotPrices();
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
