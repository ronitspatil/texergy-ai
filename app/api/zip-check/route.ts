import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp, isSameOrigin } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PTC_BASE = "https://api.powertochoose.org/api/PowerToChoose";

// Upper bounds on external calls so a slow PTC/Supabase never hangs the
// caller's "Find My Plan" button. Generous enough for cold serverless +
// healthy network, short enough that the UI recovers with a retry message.
const PTC_TIMEOUT_MS = 8000;
const DB_TIMEOUT_MS = 8000;

type PtcPlan = { company_tdu_id?: string };

function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** POST { zip } → {
 *   ok: true, tduCodes: ["ONCOR"]
 * } or {
 *   ok: false, reason: "invalid_format" | "not_deregulated" | "ptc_unreachable" | "ptc_error"
 * }
 *
 * Texas has both deregulated (ERCOT-served, where consumers pick a REP) and
 * regulated (municipal utilities like Austin Energy, CPS, co-ops) areas.
 * We only serve deregulated ZIPs — this endpoint is the gate.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  // Rate limit: 30 ZIP lookups per hour per IP. Each lookup may call the PTC
  // external API, so we want to block enumeration/scraping attempts.
  const ipHash = hashIp(getClientIp(req));
  const limit = rateLimit(`zip-check:${ipHash}`, { windowMs: 60 * 60 * 1000, max: 30 });
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

  let body: { zip?: string };
  try {
    body = (await req.json()) as { zip?: string };
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const zip = (body?.zip ?? "").trim();
  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json({ ok: false, reason: "invalid_format" });
  }

  const supabase = getServerClient();

  // Cache hit? A stalled DB call returns an error (via abortSignal) instead of
  // hanging; we surface it as ptc_unreachable so the client shows a retry.
  const { data: cached, error: cacheErr } = await supabase
    .from("service_areas")
    .select("tdu_id")
    .eq("zip", zip)
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  if (cacheErr) {
    return NextResponse.json({ ok: false, reason: "ptc_unreachable" });
  }
  if (cached && cached.length > 0) {
    const { data: tdus } = await supabase
      .from("tdus")
      .select("code")
      .in("id", cached.map((r) => r.tdu_id as number))
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
    return NextResponse.json({ ok: true, tduCodes: (tdus ?? []).map((t) => t.code as string) });
  }

  // Cache miss — ask PTC. PTC can stall for a minute or more without ever
  // failing the connection; without a timeout the request (and the user's
  // "Find My Plan" button) hangs indefinitely. Bound it so we surface a
  // retryable "unreachable" error fast instead of blocking the UI.
  let res: Response;
  try {
    res = await fetch(`${PTC_BASE}/plans?zip_code=${zip}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(PTC_TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "ptc_unreachable" });
  }
  if (!res.ok) {
    return NextResponse.json({ ok: false, reason: "ptc_error" });
  }
  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: PtcPlan[] }
    | null;
  if (!json?.success) {
    return NextResponse.json({ ok: false, reason: "ptc_error" });
  }

  const plans = json.data ?? [];
  // PTC returns zero plans for ZIPs in regulated territory (Austin Energy,
  // CPS Energy, co-ops, etc). That's our deregulation signal.
  if (plans.length === 0) {
    return NextResponse.json({ ok: false, reason: "not_deregulated" });
  }

  // Backfill the service_areas cache for next time.
  const distinctPtcTduIds = Array.from(
    new Set(plans.map((p) => p.company_tdu_id).filter((x): x is string => Boolean(x))),
  );
  if (distinctPtcTduIds.length === 0) {
    return NextResponse.json({ ok: false, reason: "not_deregulated" });
  }
  const { data: tdus } = await supabase
    .from("tdus")
    .select("id, code")
    .in("ptc_tdu_id", distinctPtcTduIds)
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  // Backfill in a single round-trip rather than one upsert per TDU.
  if (tdus && tdus.length > 0) {
    await supabase
      .from("service_areas")
      .upsert(tdus.map((tdu) => ({ zip, tdu_id: tdu.id })))
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  }
  return NextResponse.json({
    ok: true,
    tduCodes: (tdus ?? []).map((t) => t.code as string),
  });
}
