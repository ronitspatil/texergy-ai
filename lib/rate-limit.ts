type Bucket = { count: number; resetAt: number };

// Insertion-ordered map so we can evict the oldest entries when the cap is hit.
const buckets = new Map<string, Bucket>();

// Safety cap: prevents unbounded memory growth under sustained traffic.
// At ~200 bytes per entry this stays well under 2 MB even at the ceiling.
const MAX_BUCKETS = 10_000;
const EVICT_BATCH = 2_000; // Remove this many when cap is reached.

export type RateLimitOptions = {
  windowMs: number;
  max: number;
};

export function rateLimit(
  key: string,
  { windowMs, max }: RateLimitOptions,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // Evict oldest entries before inserting a new one if we're at the cap.
    if (buckets.size >= MAX_BUCKETS) {
      let evicted = 0;
      for (const [k, v] of buckets) {
        // Prefer deleting expired entries first; fall back to oldest active ones.
        if (v.resetAt <= now || evicted < EVICT_BATCH) {
          buckets.delete(k);
          evicted++;
          if (evicted >= EVICT_BATCH) break;
        }
      }
    }
    const fresh = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { allowed: true, remaining: max - 1, resetAt: fresh.resetAt };
  }

  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: max - bucket.count,
    resetAt: bucket.resetAt,
  };
}

// Periodic cleanup: remove expired buckets so the map doesn't stale-accumulate.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}, 60_000).unref?.();
