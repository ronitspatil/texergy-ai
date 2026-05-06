import { NextRequest, NextResponse } from "next/server";
import { listWaitlist } from "@/lib/db";
import { adminTokenMatches } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmt(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

function csvEscape(v: string | null | number): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  if (!process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Admin disabled." }, { status: 503 });
  }
  const token = req.nextUrl.searchParams.get("token");
  if (!adminTokenMatches(token)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const rows = await listWaitlist({ limit: 1000 });
  const lines = ["id,email,zip,referrer,created_at_iso"];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        csvEscape(r.email),
        csvEscape(r.zip),
        csvEscape(r.referrer),
        fmt(r.created_at),
      ].join(","),
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waitlist-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
