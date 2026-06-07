import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";

/** Extract the caller's IP from the proxy headers Vercel/Next set. Falls back
 *  to "unknown" so downstream hashing/rate-limiting still has a stable key. */
export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** One-way hash of the IP so we never store raw addresses in rate-limit keys. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "texergy-dev-salt-not-for-production";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** True only when the request's Origin host matches its Host — i.e. the call
 *  came from our own site, not a cross-origin scraper. Both headers must be
 *  present and parseable. */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
