import { NextRequest, NextResponse } from "next/server";
import { recommend } from "@/lib/ranking/recommend";
import { recommendSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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
    const result = await recommend({
      zip: parsed.data.zip,
      monthlyUsageKwh: parsed.data.monthlyUsageKwh ?? 1000,
      weights: parsed.data.weights,
      filters: parsed.data.filters,
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
