// Admin endpoint to manually re-validate ISR-cached pages that read from the
// plans / reps / tdus tables. Call after running scripts/ingest-plans.mjs to
// flush stale plan counts on the public pages without waiting for the 24h
// fallback (or a redeploy).
//
//   curl -s -X POST "https://texergy.ai/api/admin/revalidate" \
//        -H "Authorization: Bearer $ADMIN_TOKEN"
//
// Returns { ok, revalidated: [...paths] }.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminTokenMatches } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Data-driven public pages whose content depends on the plans/reps/tdus tables.
// Add new paths here whenever a new page reads from these tables.
const DATA_PATHS = [
  "/electricity-providers",
  "/electric-utilities",
];

function readToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const url = new URL(req.url);
  return url.searchParams.get("token");
}

function handle(req: Request) {
  if (!adminTokenMatches(readToken(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  for (const path of DATA_PATHS) revalidatePath(path);
  return NextResponse.json({ ok: true, revalidated: DATA_PATHS });
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
