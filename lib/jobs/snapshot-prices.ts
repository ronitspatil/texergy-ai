// Daily price snapshot — one row per (snapshot_date, tdu) summarizing the
// distribution of active-plan headline rates at 500/1000/2000 kWh.

import { getServiceClient } from "./supabase";

type Plan = {
  tdu_id: number;
  rate_500_kwh: number | null;
  rate_1000_kwh: number | null;
  rate_2000_kwh: number | null;
};

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  // Linear interpolation between closest ranks.
  const rank = p * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const w = rank - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round4(n: number | null): number | null {
  return n == null ? null : Math.round(n * 10000) / 10000;
}

export type SnapshotResult = {
  date: string;
  tdus: number;
  total_plans: number;
  rows_inserted: number;
};

export async function runSnapshotPrices(opts: { date?: string } = {}): Promise<SnapshotResult> {
  const supabase = getServiceClient();
  // UTC date — keeps snapshots aligned with the cron schedule (which runs in UTC).
  const date = opts.date ?? new Date().toISOString().slice(0, 10);

  // Pull all active plans' rate columns + TDU id. With ~2-3k plans this is one
  // round trip and well under any payload limit.
  const { data: plans, error: plansErr } = await supabase
    .from("plans")
    .select("tdu_id, rate_500_kwh, rate_1000_kwh, rate_2000_kwh")
    .eq("active", true)
    .not("tdu_id", "is", null);
  if (plansErr) throw plansErr;

  const byTdu = new Map<number, Plan[]>();
  for (const p of (plans ?? []) as Plan[]) {
    if (p.tdu_id == null) continue;
    const arr = byTdu.get(p.tdu_id) ?? [];
    arr.push(p);
    byTdu.set(p.tdu_id, arr);
  }

  const rows = [];
  for (const [tdu_id, list] of byTdu) {
    const r500 = list.map((p) => p.rate_500_kwh).filter((x): x is number => x != null).sort((a, b) => a - b);
    const r1000 = list.map((p) => p.rate_1000_kwh).filter((x): x is number => x != null).sort((a, b) => a - b);
    const r2000 = list.map((p) => p.rate_2000_kwh).filter((x): x is number => x != null).sort((a, b) => a - b);

    rows.push({
      snapshot_date: date,
      tdu_id,
      plan_count: list.length,
      avg_rate_500_kwh: round4(avg(r500)),
      avg_rate_1000_kwh: round4(avg(r1000)),
      avg_rate_2000_kwh: round4(avg(r2000)),
      median_rate_500_kwh: round4(median(r500)),
      median_rate_1000_kwh: round4(median(r1000)),
      median_rate_2000_kwh: round4(median(r2000)),
      p25_rate_1000_kwh: round4(percentile(r1000, 0.25)),
      p75_rate_1000_kwh: round4(percentile(r1000, 0.75)),
      min_rate_1000_kwh: r1000.length > 0 ? round4(r1000[0]) : null,
      max_rate_1000_kwh: r1000.length > 0 ? round4(r1000[r1000.length - 1]) : null,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("plan_price_snapshots")
      .upsert(rows, { onConflict: "snapshot_date,tdu_id" });
    if (error) throw error;
  }

  return {
    date,
    tdus: rows.length,
    total_plans: plans?.length ?? 0,
    rows_inserted: rows.length,
  };
}
