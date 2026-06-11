import { NextRequest, NextResponse } from "next/server";
import { addNewsletterSubscriber } from "@/lib/db";
import { sendNewsletterConfirmation } from "@/lib/email";
import { signEmail } from "@/lib/newsletter-token";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp, isSameOrigin } from "@/lib/request-guard";
import { newsletterSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://texergy.ai";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content type." }, { status: 415 });
  }

  const ipHash = hashIp(getClientIp(req));
  if (process.env.NODE_ENV === "production") {
    const limit = rateLimit(`newsletter:${ipHash}`, {
      windowMs: 60 * 60 * 1000,
      max: 5,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((limit.resetAt - Date.now()) / 1000).toString(),
          },
        },
      );
    }
  }

  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > 4_000) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = newsletterSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  const { email, source, website } = parsed.data;

  // Honeypot tripped — pretend success.
  if (website && website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  let result: { inserted: boolean; reactivated: boolean };
  try {
    result = await addNewsletterSubscriber({ email, source: source ?? null, ipHash });
  } catch (err) {
    console.error("[newsletter] DB upsert failed", err);
    return NextResponse.json(
      { error: "Could not save your subscription. Please try again." },
      { status: 500 },
    );
  }

  // Send confirmation on a new insert or a reactivation. Existing active
  // subscribers don't get a re-confirmation email (we still return ok so
  // the form can't be used to enumerate addresses).
  if (result.inserted || result.reactivated) {
    try {
      let token: string;
      try {
        token = signEmail(email);
      } catch (err) {
        // Token secret missing — still return ok to the user; flag in logs.
        console.warn("[newsletter] could not sign token:", err);
        return NextResponse.json({ ok: true });
      }
      const unsubUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
      const send = await sendNewsletterConfirmation(email, unsubUrl);
      if (send.ok) {
        console.log(`[newsletter] confirmation sent (resend id: ${send.id ?? "n/a"})`);
      } else {
        console.warn("[newsletter] email skipped:", send.error);
      }
    } catch (err) {
      console.warn("[newsletter] email error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
