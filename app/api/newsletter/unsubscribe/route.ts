import { NextRequest, NextResponse } from "next/server";
import { unsubscribeNewsletter } from "@/lib/db";
import { verifyToken } from "@/lib/newsletter-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Handles both:
//   - The user clicking the "Confirm unsubscribe" button on /unsubscribe
//     (POST with JSON { token })
//   - Gmail/Outlook's one-click List-Unsubscribe (POST with form data, no body
//     content required by the spec, with the token in the URL query string)
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  let token = url.searchParams.get("token");

  if (!token) {
    const ct = req.headers.get("content-type") ?? "";
    try {
      if (ct.includes("application/json")) {
        const body = (await req.json()) as { token?: string };
        token = body?.token ?? null;
      } else if (ct.includes("application/x-www-form-urlencoded")) {
        const form = await req.formData();
        const v = form.get("token");
        if (typeof v === "string") token = v;
      }
    } catch {
      // Fall through to the missing-token error below.
    }
  }

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  let email: string | null;
  try {
    email = verifyToken(token);
  } catch (err) {
    // Misconfigured server (missing NEWSLETTER_TOKEN_SECRET). Log it server-side
    // and return a generic invalid-link response so the user retries via reply.
    console.error("[newsletter] token verify failed", err);
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 400 });
  }

  try {
    const { updated } = await unsubscribeNewsletter(email);
    // updated=false means "already unsubscribed" — that's fine; return ok.
    return NextResponse.json({ ok: true, already: !updated });
  } catch (err) {
    console.error("[newsletter] unsubscribe failed", err);
    return NextResponse.json(
      { error: "Could not unsubscribe. Try again." },
      { status: 500 },
    );
  }
}
