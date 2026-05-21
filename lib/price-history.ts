import { createClient } from "@supabase/supabase-js";

export type PriceHistory = {
  region: string;
  sector: string;
  source: string;
  series: Record<string, number>; // {"YYYY-MM": cents/kWh}
  trailing12moAvgCents: number | null;
  trailing12moStdCents: number | null;
  trailing6moSlopeCentsPerMonth: number | null;
  latestPeriod: string | null;
  refreshedAt: string;
};

/** Server-only reader. Returns the TX residential price-history row written by
 *  scripts/fetch-eia-prices.mjs, or null if the table is empty / unconfigured.
 *  Callers should degrade gracefully (no market signal) when null.
 */
export async function readPriceHistory(
  region = "TX",
  sector = "RES",
): Promise<PriceHistory | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("price_history")
    .select(
      "region, sector, source, series, trailing_12mo_avg_cents, trailing_12mo_std_cents, trailing_6mo_slope_cents_per_month, latest_period, refreshed_at",
    )
    .eq("region", region)
    .eq("sector", sector)
    .eq("source", "eia")
    .maybeSingle();
  if (error || !data) return null;

  return {
    region: data.region,
    sector: data.sector,
    source: data.source,
    series: (data.series as Record<string, number>) ?? {},
    trailing12moAvgCents: numericOrNull(data.trailing_12mo_avg_cents),
    trailing12moStdCents: numericOrNull(data.trailing_12mo_std_cents),
    trailing6moSlopeCentsPerMonth: numericOrNull(data.trailing_6mo_slope_cents_per_month),
    latestPeriod: data.latest_period,
    refreshedAt: data.refreshed_at,
  };
}

function numericOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Compact market context the scoring engine consumes. */
export type MarketContext = {
  trailingAvgCents: number;
  trailingStdCents: number;
  trailing6moSlopeCentsPerMonth: number;
  latestPeriod: string | null;
};

export function toMarketContext(h: PriceHistory | null): MarketContext | null {
  if (!h || h.trailing12moAvgCents == null) return null;
  return {
    trailingAvgCents: h.trailing12moAvgCents,
    trailingStdCents: h.trailing12moStdCents ?? 0,
    trailing6moSlopeCentsPerMonth: h.trailing6moSlopeCentsPerMonth ?? 0,
    latestPeriod: h.latestPeriod,
  };
}

/** TX retail electricity has a strong seasonal pattern: summer cooling load
 *  (Jun-Sep) and winter cold snaps (Dec-Feb) drive ERCOT price spikes; spring
 *  and fall are mild. These hardcoded priors encode that domain knowledge, and
 *  get blended with the EIA-derived per-month signal (which is noisy with only
 *  ~4 years of data per month). Indexed Jan=0..Dec=11. */
const TX_SEASONAL_PRIOR = [
  0.90, // Jan — winter, occasional cold snaps
  0.95, // Feb — Uri-style risk window
  0.85, // Mar
  0.85, // Apr
  0.95, // May — early heat
  1.10, // Jun — summer peak begins
  1.25, // Jul — peak month
  1.30, // Aug — hottest, ERCOT EEAs most common
  1.15, // Sep — late summer
  0.85, // Oct
  0.80, // Nov
  0.95, // Dec — early winter
];

export type SeasonalContext = {
  /** Per-month (Jan=0..Dec=11) price-volatility weight. Higher = historically
   *  more expensive / more volatile. Blends a hardcoded TX prior with EIA
   *  monthly averages and std-devs when the price-history series is available. */
  monthlyVolatilityWeights: number[];
  /** Per-month average cents/kWh from the EIA series, for diagnostics. Empty
   *  array when no series data is available. */
  monthlyAvgCents: number[];
  /** True when EIA data was incorporated; false when output is pure prior. */
  empiricallyAnchored: boolean;
};

export function deriveSeasonalContext(h: PriceHistory | null): SeasonalContext {
  const series = h?.series ?? {};
  const periods = Object.keys(series);
  if (periods.length < 12) {
    return {
      monthlyVolatilityWeights: [...TX_SEASONAL_PRIOR],
      monthlyAvgCents: [],
      empiricallyAnchored: false,
    };
  }

  const byMonth: number[][] = Array.from({ length: 12 }, () => []);
  for (const period of periods) {
    const monthIdx = parseInt(period.split("-")[1], 10) - 1;
    const v = Number(series[period]);
    if (Number.isFinite(v) && monthIdx >= 0 && monthIdx < 12) byMonth[monthIdx].push(v);
  }

  const monthlyAvgCents = byMonth.map((vals) =>
    vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length,
  );
  const overallMean =
    monthlyAvgCents.filter((v) => v > 0).reduce((a, b) => a + b, 0) /
    Math.max(1, monthlyAvgCents.filter((v) => v > 0).length);

  const monthlyStd = byMonth.map((vals) => {
    if (vals.length < 2) return 0;
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.sqrt(vals.reduce((s, x) => s + (x - m) ** 2, 0) / (vals.length - 1));
  });
  const overallStd =
    monthlyStd.filter((v) => v > 0).reduce((a, b) => a + b, 0) /
    Math.max(1, monthlyStd.filter((v) => v > 0).length);

  // Blend: 60% hardcoded prior (stable, captures structural seasonality),
  // 40% empirical (catches drift / regime change). For each month, the empirical
  // component is the average of price-vs-overall and std-vs-overall ratios.
  const monthlyVolatilityWeights = TX_SEASONAL_PRIOR.map((prior, i) => {
    if (monthlyAvgCents[i] === 0) return prior;
    const priceRatio = overallMean > 0 ? monthlyAvgCents[i] / overallMean : 1;
    const stdRatio = overallStd > 0 ? monthlyStd[i] / overallStd : 1;
    const empirical = (priceRatio + stdRatio) / 2;
    return 0.6 * prior + 0.4 * empirical;
  });

  return { monthlyVolatilityWeights, monthlyAvgCents, empiricallyAnchored: true };
}
