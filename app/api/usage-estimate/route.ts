import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp, isSameOrigin } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WATTBUY_BASE = "https://apis.wattbuy.com/v3";

// Bound the external call so a slow WattBuy never hangs the user's request.
const WATTBUY_TIMEOUT_MS = 8000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The normalized client-facing shape. Mirrors UsageEstimate in wizard-types. */
type GraphPoint = { month: string; kwh: number; cost: number | null };
type UsageEstimatePayload = {
  ok: true;
  stateName: string | null;
  estUsageAnnualKwh: number;
  monthlyAvgKwh: number;
  avgMonthlyCost: number | null;
  estBill: { min: number; max: number } | null;
  interpolated: boolean;
  graph: GraphPoint[];
};

/** Raw WattBuy estimation response (only the fields we consume). */
type WattBuyEstimation = {
  state_name?: string;
  graph_data?: { x?: string; y?: number }[];
  monthly_cost?: number[];
  est_bill_amount?: { min?: number; max?: number };
  est_usage?: number;
  interpolated?: boolean;
};

/** Optional housing inputs we forward to WattBuy. Anything outside this set is
 *  dropped so the client can't smuggle arbitrary query params upstream. */
const STRING_FIELDS = ["address", "city", "state", "house_type", "heating_fuel_source"] as const;
const NUMBER_FIELDS = ["year_built", "bedrooms", "bathrooms", "sq_ft", "stories"] as const;

type RequestBody = {
  zip?: string;
} & Partial<Record<(typeof STRING_FIELDS)[number], string>> &
  Partial<Record<(typeof NUMBER_FIELDS)[number], number | string>>;

/** POST { zip, address?, city?, state?, year_built?, bedrooms?, bathrooms?,
 *  sq_ft?, stories?, house_type?, heating_fuel_source? }
 *  → UsageEstimatePayload | { ok:false, reason }
 *
 *  Proxies WattBuy's electricity-estimation model so the API key stays
 *  server-side. ZIP alone yields an area-average forecast; an address or
 *  housing details sharpen it. Failures map to typed reasons so the UI can
 *  fall back to its heuristic/baseline number instead of showing an error.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const ipHash = hashIp(getClientIp(req));
  const limit = rateLimit(`usage-estimate:${ipHash}`, { windowMs: 60 * 60 * 1000, max: 30 });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil((limit.resetAt - Date.now()) / 1000).toString() },
      },
    );
  }

  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.json({ ok: false, reason: "bad_content_type" }, { status: 415 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const zip = (body?.zip ?? "").trim();
  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
  }

  const apiKey = process.env.WATTBUY_API_KEY;
  if (!apiKey) {
    // No key configured — let the client fall back to its heuristic baseline.
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  // Build the upstream query from whitelisted fields only.
  const params = new URLSearchParams({ zip });
  for (const field of STRING_FIELDS) {
    const v = body[field];
    if (typeof v === "string" && v.trim()) params.set(field, v.trim());
  }
  for (const field of NUMBER_FIELDS) {
    const v = body[field];
    if (v === undefined || v === null || v === "") continue;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n > 0) params.set(field, String(n));
  }

  let res: Response;
  try {
    res = await fetch(`${WATTBUY_BASE}/electricity/estimation?${params.toString()}`, {
      headers: { Accept: "application/json", "x-api-key": apiKey },
      signal: AbortSignal.timeout(WATTBUY_TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "unreachable" });
  }

  // WattBuy returns 204 when it can't compute an estimate for the inputs.
  if (res.status === 204) {
    return NextResponse.json({ ok: false, reason: "no_estimate" });
  }
  if (res.status === 401 || res.status === 403) {
    return NextResponse.json({ ok: false, reason: "auth" });
  }
  if (res.status === 400) {
    return NextResponse.json({ ok: false, reason: "invalid_input" });
  }
  if (!res.ok) {
    return NextResponse.json({ ok: false, reason: "upstream_error" });
  }

  const json = (await res.json().catch(() => null)) as WattBuyEstimation | null;
  if (!json || typeof json.est_usage !== "number") {
    return NextResponse.json({ ok: false, reason: "no_estimate" });
  }

  const graphData = Array.isArray(json.graph_data) ? json.graph_data : [];
  const monthlyCost = Array.isArray(json.monthly_cost) ? json.monthly_cost : [];
  const graph: GraphPoint[] = graphData.map((point, i) => ({
    month: point.x ?? MONTHS[i] ?? `M${i + 1}`,
    kwh: Math.round(Number(point.y) || 0),
    cost: typeof monthlyCost[i] === "number" ? Math.round(monthlyCost[i]!) : null,
  }));

  const costValues = monthlyCost.filter((c): c is number => typeof c === "number");
  const avgMonthlyCost =
    costValues.length > 0
      ? Math.round(costValues.reduce((sum, c) => sum + c, 0) / costValues.length)
      : null;

  const estUsageAnnualKwh = Math.round(json.est_usage);
  const payload: UsageEstimatePayload = {
    ok: true,
    stateName: json.state_name ?? null,
    estUsageAnnualKwh,
    monthlyAvgKwh: Math.round(estUsageAnnualKwh / 12),
    avgMonthlyCost,
    estBill:
      json.est_bill_amount &&
      typeof json.est_bill_amount.min === "number" &&
      typeof json.est_bill_amount.max === "number"
        ? { min: Math.round(json.est_bill_amount.min), max: Math.round(json.est_bill_amount.max) }
        : null,
    interpolated: Boolean(json.interpolated),
    graph,
  };
  return NextResponse.json(payload);
}
