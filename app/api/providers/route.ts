import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/providers
 *  Returns { providers: [{ id, name }, ...] } sorted alphabetically.
 *  Used by the results sidebar to render the "filter by provider" checkbox
 *  dropdown. Limited to REPs that have at least one active plan so the list
 *  doesn't show defunct companies.
 */
// Providers list is stable between plan ingests (happens at most daily).
// Cache for 1 hour at the CDN edge so repeated page loads don't hammer the DB.
const CACHE_SECONDS = 3600;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ providers: [] });
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Single query: join reps to active plans so we only return REPs that have
  // at least one live plan. Using !inner forces a filtering inner join instead
  // of two separate round trips.
  const { data: reps } = await supabase
    .from("reps")
    .select("id, name, plans!inner(id)")
    .eq("plans.active", true)
    .order("name", { ascending: true });

  const providers = Array.from(
    // Deduplicate by rep id in case the join returns multiple plan rows per rep.
    new Map(
      (reps ?? []).map((r) => [Number(r.id), { id: Number(r.id), name: String(r.name) }]),
    ).values(),
  );

  return NextResponse.json(
    { providers },
    {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=300`,
      },
    },
  );
}
