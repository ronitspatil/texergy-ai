import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp, isSameOrigin } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 8000;

// TDU codes are short, uppercase, underscore-separated identifiers
// (ONCOR, CENTERPOINT, AEP_CENTRAL, AEP_NORTH, TNMP). Bound the request so a
// caller can't ask for an unbounded `in (...)` list.
const TDU_CODE_RE = /^[A-Z][A-Z_]{1,31}$/;
const MAX_TDUS = 12;

function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type PriceHistoryPoint = {
  date: string;
  avg500: number | null;
  avg1000: number | null;
  avg2000: number | null;
  planCount: number | null;
};

export type PriceHistorySeries = {
  code: string;
  points: PriceHistoryPoint[];
};

export type PriceHistoryResponse = {
  series: PriceHistorySeries[];
};

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/** POST { tduCodes: ["ONCOR", ...] } → daily price history per TDU.
 *
 * Powers the live historical-pricing graph on the match page. The match page
 * already knows which TDUs serve the entered ZIP (from /api/recommend), so it
 * passes those codes here rather than re-resolving the ZIP. We return the per-
 * TDU daily median/percentile series captured by the nightly snapshot job
 * (`plan_price_snapshots`), oldest → newest. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Lightweight read, but it still hits the DB — cap per-IP volume so the live
  // refresh poll can't be abused into a tight loop.
  const limit = rateLimit(`price-history:${hashIp(getClientIp(req))}`, {
    windowMs: 60 * 60 * 1000,
    max: 240,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil((limit.resetAt - Date.now()) / 1000).toString() },
      },
    );
  }

  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content type." }, { status: 415 });
  }

  let body: { tduCodes?: unknown };
  try {
    body = (await req.json()) as { tduCodes?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const codes = Array.isArray(body.tduCodes)
    ? Array.from(
        new Set(
          body.tduCodes
            .filter((c): c is string => typeof c === "string")
            .map((c) => c.trim().toUpperCase())
            .filter((c) => TDU_CODE_RE.test(c)),
        ),
      ).slice(0, MAX_TDUS)
    : [];

  if (codes.length === 0) {
    return NextResponse.json({ series: [] } satisfies PriceHistoryResponse);
  }

  const supabase = getServerClient();

  // Map codes → ids first; the snapshot table is keyed by tdu_id.
  const { data: tdus, error: tduErr } = await supabase
    .from("tdus")
    .select("id, code")
    .in("code", codes)
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  if (tduErr) {
    return NextResponse.json({ error: "Could not load price history." }, { status: 500 });
  }
  const idToCode = new Map<number, string>(
    (tdus ?? []).map((t) => [t.id as number, t.code as string]),
  );
  if (idToCode.size === 0) {
    return NextResponse.json({ series: [] } satisfies PriceHistoryResponse);
  }

  const { data: snaps, error: snapErr } = await supabase
    .from("plan_price_snapshots")
    .select(
      "tdu_id, snapshot_date, plan_count, avg_rate_500_kwh, avg_rate_1000_kwh, avg_rate_2000_kwh",
    )
    .in("tdu_id", Array.from(idToCode.keys()))
    .order("snapshot_date", { ascending: true })
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  if (snapErr) {
    return NextResponse.json({ error: "Could not load price history." }, { status: 500 });
  }

  const byCode = new Map<string, PriceHistoryPoint[]>();
  for (const code of idToCode.values()) byCode.set(code, []);
  for (const row of snaps ?? []) {
    const code = idToCode.get(row.tdu_id as number);
    if (!code) continue;
    byCode.get(code)!.push({
      date: row.snapshot_date as string,
      avg500: num(row.avg_rate_500_kwh),
      avg1000: num(row.avg_rate_1000_kwh),
      avg2000: num(row.avg_rate_2000_kwh),
      planCount: num(row.plan_count),
    });
  }

  const series: PriceHistorySeries[] = Array.from(byCode.entries())
    .filter(([, points]) => points.length > 0)
    .map(([code, points]) => ({ code, points }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return NextResponse.json({ series } satisfies PriceHistoryResponse);
}
