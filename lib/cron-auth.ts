// Vercel cron requests carry `Authorization: Bearer ${CRON_SECRET}` when
// CRON_SECRET is configured on the project. Outside Vercel the same env var
// gates manual triggers (e.g., curl from a laptop).

import { timingSafeEqual } from "node:crypto";

export function verifyCronRequest(req: Request): { ok: true } | { ok: false; status: number; message: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    return { ok: false, status: 500, message: "CRON_SECRET not configured on server" };
  }
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided) return { ok: false, status: 401, message: "missing bearer token" };

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, message: "invalid token" };
  }
  return { ok: true };
}
