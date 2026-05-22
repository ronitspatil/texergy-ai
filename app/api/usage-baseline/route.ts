import { NextResponse } from "next/server";
import { readUsageBaseline, FALLBACK_TX_KWH } from "@/lib/usage-baseline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/usage-baseline?region=TX
 *  Returns the cached EIA-derived monthly average kWh for the region, plus the
 *  data window so the UI can attribute the source. Falls back gracefully when
 *  the table is empty / not yet seeded.
 */
// Baseline data refreshes daily at most. Cache aggressively at the edge.
const CACHE_SECONDS = 3600;

// Only two-letter uppercase US state codes are valid region values.
const REGION_RE = /^[A-Z]{2}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawRegion = (url.searchParams.get("region") ?? "TX").trim().toUpperCase();
  // Reject anything that doesn't look like a state code to prevent path/query injection.
  const region = REGION_RE.test(rawRegion) ? rawRegion : "TX";

  const baseline = await readUsageBaseline(region);
  const cacheHeaders = {
    "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`,
  };

  if (!baseline) {
    return NextResponse.json(
      {
        region,
        monthlyAvgKwh: FALLBACK_TX_KWH,
        source: "fallback",
        dataStart: null,
        dataEnd: null,
        monthlyBreakdown: null,
      },
      { headers: cacheHeaders },
    );
  }
  return NextResponse.json(
    {
      region: baseline.region,
      monthlyAvgKwh: baseline.monthlyAvgKwh,
      source: baseline.source,
      dataStart: baseline.dataStart,
      dataEnd: baseline.dataEnd,
      monthlyBreakdown: baseline.monthlyBreakdown,
    },
    { headers: cacheHeaders },
  );
}
