// Server-side proxy for MeterPlan's get-utility-for-zip lookup. Falls back
// to our own Supabase service_areas cache + tdus table when the upstream is
// unavailable, so the lookup always returns a meaningful answer.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp, isSameOrigin } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = "https://meterplan.com/api/v1/get-utility-for-zip";
const REQUEST_TIMEOUT_MS = 6_000;

type UpstreamResponse = {
  zipCode?: string;
  utilityCode?: string;
  utilityDisplayName?: string;
  utilityShortName?: string;
  isDeregulated?: boolean;
  eligibilityLikelihood?: number;
  resolved?: boolean;
};

type LookupResult = UpstreamResponse & { source: "meter_api" | "supabase_cache" | "none" };

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Proxies a paid MeterPlan lookup; cap per-IP volume to prevent scraping.
  const limit = rateLimit(`utility-for-zip:${hashIp(getClientIp(req))}`, {
    windowMs: 60 * 60 * 1000,
    max: 40,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many lookups. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil((limit.resetAt - Date.now()) / 1000).toString() },
      },
    );
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 200) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const zip = (body as { zip?: unknown; zipCode?: unknown })?.zip ?? (body as { zipCode?: unknown })?.zipCode;
  if (typeof zip !== "string" || !/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "ZIP must be 5 digits." }, { status: 400 });
  }

  // 1. Try MeterPlan upstream.
  const upstream = await fetchFromMeter(zip).catch(() => null);
  if (upstream) {
    return NextResponse.json({ ...upstream, source: "meter_api" } satisfies LookupResult);
  }

  // 2. Fall back to our own service_areas cache → tdus join.
  const local = await fetchFromSupabase(zip).catch(() => null);
  if (local) {
    return NextResponse.json({ ...local, source: "supabase_cache" } satisfies LookupResult);
  }

  // 3. Give up cleanly — return a `resolved: false` shape the client renders
  //    as "we don't know yet" rather than crashing.
  return NextResponse.json({
    zipCode: zip,
    utilityCode: null,
    utilityDisplayName: null,
    utilityShortName: null,
    isDeregulated: false,
    eligibilityLikelihood: 0,
    resolved: false,
    source: "none",
  });
}

async function fetchFromMeter(zip: string): Promise<UpstreamResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ zipCode: zip }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as UpstreamResponse | null;
    if (!json || typeof json.utilityCode !== "string") return null;
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromSupabase(zip: string): Promise<UpstreamResponse | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows } = await supabase
    .from("service_areas")
    .select("tdu_id")
    .eq("zip", zip)
    .limit(1);
  const tduId = rows?.[0]?.tdu_id;
  if (tduId == null) return null;

  const { data: tdu } = await supabase
    .from("tdus")
    .select("code, name")
    .eq("id", tduId)
    .single();
  if (!tdu) return null;

  return {
    zipCode: zip,
    utilityCode: String(tdu.code),
    utilityDisplayName: String(tdu.name),
    utilityShortName: shortName(String(tdu.code)),
    isDeregulated: true, // any ZIP in our service_areas cache is deregulated
    eligibilityLikelihood: 1,
    resolved: true,
  };
}

function shortName(code: string): string {
  const map: Record<string, string> = {
    ONCOR: "Oncor",
    CENTERPOINT: "CenterPoint",
    CNP: "CenterPoint",
    AEP_CENTRAL: "AEP Central",
    AEP_NORTH: "AEP North",
    TNMP: "TNMP",
    LPPL: "Lubbock Power & Light",
  };
  return map[code] ?? code;
}
