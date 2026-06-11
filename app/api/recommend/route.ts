import { NextRequest, NextResponse } from "next/server";
import { recommend } from "@/lib/ranking/recommend";
import { recommendSchema } from "@/lib/validation";
import { getMonthlyAverageKwh } from "@/lib/usage-baseline";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp, isSameOrigin } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Ranking scans the full plans table and runs the scoring pipeline, so it's
  // the most expensive endpoint. Cap per-IP volume to keep one client from
  // pinning the DB / serverless CPU under a tight loop.
  const limit = rateLimit(`recommend:${hashIp(getClientIp(req))}`, {
    windowMs: 60 * 60 * 1000,
    max: 60,
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

  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > 8_000) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = recommendSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const usageKwh = parsed.data.monthlyUsageKwh ?? (await getMonthlyAverageKwh("TX"));
    const result = await recommend({
      zip: parsed.data.zip,
      monthlyUsageKwh: usageKwh,
      weights: parsed.data.weights,
      filters: parsed.data.filters,
      devices: parsed.data.devices,
      limit: parsed.data.limit,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[recommend] failed", err);
    return NextResponse.json(
      { error: "Could not generate recommendations. Please try again." },
      { status: 500 },
    );
  }
}
