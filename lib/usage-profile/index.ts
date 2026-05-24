// Usage-profile fetcher. Returns a 12-month × 24-hour kWh projection for the
// user's home, scaled from a normalized ERCOT residential curve.
//
// Resolution chain (in order):
//   1. In-memory LRU cache (keyed on zone + profile type + year)
//   2. Meter API (https://meterplan.com) — best data, free, rate-limited
//   3. Bundled static fallback (lib/usage-profile/static.ts) — always works
//
// The Meter API is an enhancement; the site is fully functional without it.
// Set DISABLE_METER_API=1 in the environment to skip the API entirely.

import { getStaticProfile, type StaticLoadProfile } from "./static.ts";

export type UsageProfileSource = "meter_api" | "bundled_static";

export type UsageProfile = {
  /** Scaled to the user's annual kWh. Indexed [month 0-11][hour 0-23]. */
  monthlyHourlyKwh: number[][];
  /** Derived: sum across hours per month. Length 12. */
  monthlyTotalsKwh: number[];
  annualKwh: number;
  weatherZone: string;
  profileType: string;
  source: UsageProfileSource;
};

const METER_API_BASE = "https://meterplan.com/api/v1";
const API_TIMEOUT_MS = 6000;
// Real API responses are valid for ~a year (profiles update annually) — 7d
// is conservative. Static fallbacks expire fast so we keep retrying the API
// after a transient failure instead of locking in the fallback for a week.
const API_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STATIC_CACHE_TTL_MS = 60 * 1000;             // 1 minute

type CacheEntry = {
  fractions: number[][];      // normalized 12×24, sums to 1.0
  weatherZone: string;
  profileType: string;
  source: UsageProfileSource;
  fetchedAt: number;
};

const memoryCache = new Map<string, CacheEntry>();

function cacheKey(zoneOrZip: string, profileType: string): string {
  return `${zoneOrZip}::${profileType}`;
}

function isFresh(entry: CacheEntry): boolean {
  const ttl = entry.source === "meter_api" ? API_CACHE_TTL_MS : STATIC_CACHE_TTL_MS;
  return Date.now() - entry.fetchedAt < ttl;
}

/** Public entry point. Always returns a UsageProfile — never throws.
 *  If every source fails, falls back to the bundled static curve. */
export async function getUsageProfile(
  zipOrZone: string,
  annualKwh: number,
  opts: { profileType?: string } = {},
): Promise<UsageProfile> {
  const profileType = opts.profileType ?? "RESHIWR";
  const key = cacheKey(zipOrZone, profileType);

  // 1. Memory cache
  const cached = memoryCache.get(key);
  if (cached && isFresh(cached)) {
    return scaleFractions(cached, annualKwh);
  }

  // 2. Meter API (best effort)
  if (process.env.DISABLE_METER_API !== "1") {
    const apiResult = await fetchFromMeterApi(zipOrZone, profileType).catch(() => null);
    if (apiResult) {
      memoryCache.set(key, apiResult);
      return scaleFractions(apiResult, annualKwh);
    }
  }

  // 3. Bundled static fallback — always succeeds
  const fallback = staticToCacheEntry(zipOrZone, profileType);
  memoryCache.set(key, fallback);
  return scaleFractions(fallback, annualKwh);
}

function staticToCacheEntry(zoneOrZip: string, profileType: string): CacheEntry {
  const sp: StaticLoadProfile = getStaticProfile(zoneOrZip, profileType);
  return {
    fractions: sp.monthlyHourlyFractions,
    weatherZone: sp.weatherZone,
    profileType: sp.profileType,
    source: "bundled_static",
    fetchedAt: Date.now(),
  };
}

function scaleFractions(entry: CacheEntry, annualKwh: number): UsageProfile {
  const monthlyHourlyKwh: number[][] = entry.fractions.map((row) =>
    row.map((frac) => frac * annualKwh),
  );
  const monthlyTotalsKwh = monthlyHourlyKwh.map((row) =>
    row.reduce((a, b) => a + b, 0),
  );
  return {
    monthlyHourlyKwh,
    monthlyTotalsKwh,
    annualKwh,
    weatherZone: entry.weatherZone,
    profileType: entry.profileType,
    source: entry.source,
  };
}

async function fetchFromMeterApi(
  zipOrZone: string,
  profileType: string,
): Promise<CacheEntry | null> {
  const isZip = /^\d{5}$/.test(zipOrZone);
  const body: Record<string, unknown> = {
    profileType,
    granularity: "monthly_hourly",
  };
  if (isZip) body.zipCode = zipOrZone;
  else body.weatherZone = zipOrZone;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${METER_API_BASE}/get-residential-load-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    console.warn("[usage-profile] fetch threw", (err as Error)?.name, (err as Error)?.message);
    return null;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    console.warn("[usage-profile] non-ok status", res.status);
    return null;
  }

  const json = (await res.json().catch(() => null)) as
    | {
        resolvedWeatherZone?: string;
        profileType?: string;
        annualTotalKwh?: number;
        // Meter's monthly_hourly granularity returns `avgKwh` per (month, hour).
        // Some older docs referenced `kwh`; accept either to be defensive.
        intervals?: Array<{ month: number; hour: number; avgKwh?: number; kwh?: number }>;
      }
    | null;

  if (!json || !Array.isArray(json.intervals) || !json.annualTotalKwh) {
    console.warn("[usage-profile] missing fields", { hasJson: !!json, intervals: Array.isArray(json?.intervals), annual: json?.annualTotalKwh });
    return null;
  }
  if (!Number.isFinite(json.annualTotalKwh) || json.annualTotalKwh <= 0) return null;

  // Each entry's avgKwh is the typical kWh used between hour h and h+1 on a
  // single day in month m. To get the month's contribution at that hour we
  // multiply by the number of days in that month, then normalize against the
  // annual total. Sum across all 288 cells = 1.0 by construction.
  const DAYS_IN_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const matrix: number[][] = Array.from({ length: 12 }, () => Array(24).fill(0));
  for (const entry of json.intervals) {
    const m = entry.month - 1; // API returns 1-12
    const h = entry.hour;
    if (m < 0 || m > 11 || h < 0 || h > 23) continue;
    const kwh = entry.avgKwh ?? entry.kwh;
    if (kwh == null || !Number.isFinite(kwh)) continue;
    matrix[m][h] = (kwh * DAYS_IN_MONTH[m]) / json.annualTotalKwh;
  }

  // Sanity check: the normalized matrix should sum to ~1.0. NaN-safe — a
  // malformed response (wrong field name, missing intervals) yields a matrix
  // of zeros and total = 0, which fails the band and falls back to static.
  const total = matrix.flat().reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total) || total < 0.95 || total > 1.05) {
    console.warn("[usage-profile] sanity check failed", { total, intervalsLen: json.intervals.length, firstEntry: json.intervals[0] });
    return null;
  }

  return {
    fractions: matrix,
    weatherZone: json.resolvedWeatherZone ?? zipOrZone,
    profileType: json.profileType ?? profileType,
    source: "meter_api",
    fetchedAt: Date.now(),
  };
}
