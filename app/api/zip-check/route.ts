import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PTC_BASE = "https://api.powertochoose.org/api/PowerToChoose";

type PtcPlan = { company_tdu_id?: string };

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

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

  // Cache hit?
  const { data: cached } = await supabase.from("service_areas").select("tdu_id").eq("zip", zip);
  if (cached && cached.length > 0) {
    const { data: tdus } = await supabase
      .from("tdus")
      .select("code")
      .in("id", cached.map((r) => r.tdu_id as number));
    return NextResponse.json({ ok: true, tduCodes: (tdus ?? []).map((t) => t.code as string) });
  }

  // Cache miss — ask PTC.
  let res: Response;
  try {
    res = await fetch(`${PTC_BASE}/plans?zip_code=${zip}`, {
      headers: { Accept: "application/json" },
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
    .in("ptc_tdu_id", distinctPtcTduIds);
  for (const tdu of tdus ?? []) {
    await supabase.from("service_areas").upsert({ zip, tdu_id: tdu.id });
  }
  return NextResponse.json({
    ok: true,
    tduCodes: (tdus ?? []).map((t) => t.code as string),
  });
}
