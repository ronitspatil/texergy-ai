// HMAC-signed tokens for newsletter unsubscribe links.
// Format: base64url(email).base64url(sig)
// The token never expires (unsubscribing is non-destructive: re-subscribing
// works as a normal new signup).

import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const s = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!s || s.length < 16) {
    throw new Error("NEWSLETTER_TOKEN_SECRET not configured (need 16+ chars)");
  }
  return s;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payload: string): string {
  return b64urlEncode(createHmac("sha256", getSecret()).update(payload).digest());
}

export function signEmail(email: string): string {
  const payload = b64urlEncode(Buffer.from(email.toLowerCase(), "utf8"));
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expectedSig = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const email = b64urlDecode(payload).toString("utf8");
    // Basic sanity check; full validation happens in the DB upsert.
    if (!email.includes("@") || email.length > 254) return null;
    return email;
  } catch {
    return null;
  }
}
