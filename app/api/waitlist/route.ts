import { NextRequest, NextResponse } from "next/server";
import { addToWaitlist } from "@/lib/db";
import { sendWaitlistConfirmation } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp, isSameOrigin } from "@/lib/request-guard";
import { waitlistSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json(
      { error: "Unsupported content type." },
      { status: 415 },
    );
  }

  const ip = getClientIp(req);
  const ipHash = hashIp(ip);

  // Rate limit only in production. In dev we'd burn through the 5/hour cap
  // during testing and lock ourselves out.
  if (process.env.NODE_ENV === "production") {
    const limit = rateLimit(`waitlist:${ipHash}`, {
      windowMs: 60 * 60 * 1000,
      max: 5,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (limit.resetAt - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }
  }

  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > 4_000) {
      return NextResponse.json(
        { error: "Payload too large." },
        { status: 413 },
      );
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { email, zip, referrer, website } = parsed.data;

  // Honeypot tripped — pretend success to avoid signaling bots.
  if (website && website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  let inserted = false;
  try {
    const result = await addToWaitlist({ email, zip, referrer, ipHash });
    inserted = result.inserted;
  } catch (err) {
    console.error("[waitlist] DB insert failed", err);
    return NextResponse.json(
      { error: "Could not save your spot. Please try again." },
      { status: 500 },
    );
  }

  // Send confirmation email only on a real (new) insert. We *await* it
  // because on Vercel's serverless runtime, fire-and-forget promises after
  // the response is sent can be terminated before the email actually goes
  // out. A failure here still returns 200 — the user is on the waitlist
  // even if the welcome email hiccupped.
  if (inserted) {
    try {
      // referrer="blog" comes from the blog page's subscribe form; everything
      // else (home-page waitlist, embedded forms) gets the early-access copy.
      const context = referrer === "blog" ? "blog" : "waitlist";
      const result = await sendWaitlistConfirmation(email, zip ?? null, context);
      if (result.ok) {
        // Log only the Resend message id — never the email address (PII).
        console.log(
          `[waitlist] confirmation sent (resend id: ${result.id ?? "n/a"})`,
        );
      } else {
        console.warn("[waitlist] email skipped:", result.error);
      }
    } catch (err) {
      console.warn("[waitlist] email error:", err);
    }
  }

  // Always return the same shape regardless of whether the email already
  // existed — prevents enumeration of registered addresses.
  return NextResponse.json({ ok: true });
}
