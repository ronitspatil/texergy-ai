// Server-side proxy for the MeterPlan ESI ID lookup. Proxying server-side
// keeps the upstream rate-limit keyed to our deployment IP (predictable
// behavior) and avoids any CORS friction in the browser. We also add a thin
// validation layer + same-origin gate so the endpoint can't be hammered as
// a free public lookup.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp, isSameOrigin } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = "https://meterplan.com/api/v1/lookup-esi-id";
const REQUEST_TIMEOUT_MS = 12_000;

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Every call proxies a paid MeterPlan address lookup, so cap per-IP volume to
  // stop the endpoint being abused as a free public address-search API.
  const rl = rateLimit(`esid-lookup:${hashIp(getClientIp(req))}`, {
    windowMs: 60 * 60 * 1000,
    max: 20,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many lookups. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil((rl.resetAt - Date.now()) / 1000).toString() },
      },
    );
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 2_000) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { query, maxResults } = body as { query?: unknown; maxResults?: unknown };

  if (typeof query !== "string" || query.trim().length < 4) {
    return NextResponse.json(
      { error: "Please enter a full street address (e.g. \"123 Main St, Austin 78701\")." },
      { status: 400 },
    );
  }

  const limit =
    typeof maxResults === "number" && maxResults > 0 && maxResults <= 25
      ? Math.floor(maxResults)
      : 10;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Identify ourselves so MeterPlan can reach out if there's an issue.
        "User-Agent": "Texergy-AI/1.0 (+https://texergy.ai)",
      },
      body: JSON.stringify({ query: query.trim(), maxResults: limit }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.warn("[esid-lookup] upstream error", upstream.status, text.slice(0, 300));
      if (upstream.status === 429) {
        return NextResponse.json(
          { error: "Lookup is temporarily rate-limited. Try again in a minute." },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: "Lookup service is unavailable right now. Try again shortly." },
        { status: 502 },
      );
    }

    const data = (await upstream.json()) as unknown;
    return NextResponse.json(data, {
      headers: {
        // Don't cache — addresses are personal queries.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof Error && err.name === "AbortError";
    console.warn("[esid-lookup] fetch failed", err);
    return NextResponse.json(
      {
        error: aborted
          ? "Lookup timed out. Try again with a more specific address."
          : "Network error reaching the lookup service.",
      },
      { status: 504 },
    );
  }
}
