import { assessBillCredits, estimateMonthlyBill } from "./cost.ts";
import {
  type Breakdown,
  type DeviceFlag,
  type MarketContext,
  type PlanForScoring,
  type RankedPlan,
  type Weights,
  DEFAULT_WEIGHTS,
} from "./types.ts";

const MONTHS_PER_YEAR = 12;

/** Score and rank a candidate set of plans for one user context.
 *
 * Scoring is two-pass: first compute raw metrics per plan, then normalize
 * each metric across the candidate set (so "cheapest" is relative to what's
 * available in this user's TDU, not absolute), then weight + sum.
 */
export function scoreAndRank(
  candidates: PlanForScoring[],
  usageKwh: number,
  weights: Weights,
  limit: number,
  market: MarketContext | null = null,
  devices: DeviceFlag[] = [],
): RankedPlan[] {
  const w = normalizeWeights(weights);
  if (candidates.length === 0) return [];

  // ----- Pass 1: raw metrics -----
  const raw = candidates.map((plan) => {
    const cost = estimateMonthlyBill(plan, usageKwh);
    return {
      plan,
      monthlyUsd: cost?.usd ?? null,
      costSource: cost?.source ?? null,
      renewablePct: plan.renewable_pct ?? 0,
      etfUsd: plan.etf_amount ?? 0,
      termMonths: plan.term_months ?? 0,
      rateType: plan.rate_type,
    };
  });

  // Drop plans we genuinely can't price — they can't be honestly ranked on
  // cost, and cost is the dominant factor. Surface them only in a separate
  // "unrated" bucket later if we ever want that.
  const priced = raw.filter((r): r is typeof r & { monthlyUsd: number; costSource: NonNullable<typeof r.costSource> } => r.monthlyUsd != null);
  if (priced.length === 0) return [];

  // ----- Pass 2: normalize -----
  // Cost: lower is better. Linearly map [min, max] → [1, 0]. If everything's
  // the same cost, all plans get cost=1 (neutral).
  const costs = priced.map((r) => r.monthlyUsd);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const costSpread = maxCost - minCost;
  const costScore = (c: number) =>
    costSpread === 0 ? 1 : 1 - (c - minCost) / costSpread;

  // Renewable: % directly, 0..100 → 0..1.
  const renewScore = (pct: number) => Math.max(0, Math.min(1, pct / 100));

  // Contract flexibility: lower ETF + shorter term = more flexible. ETF
  // normalized against $500 cap (anything ≥ $500 → 0); term normalized
  // against 36mo cap. Equal blend.
  const flexScore = (etf: number, term: number) => {
    const etfPart = 1 - Math.min(1, etf / 500);
    const termPart = 1 - Math.min(1, term / 36);
    return 0.5 * etfPart + 0.5 * termPart;
  };

  // Rate stability: Fixed > Variable. Variable plans are scored against *real*
  // historical volatility (EIA TX residential trailing-12-month std-dev / avg)
  // when available. Calm market → Variable scores near 0.65; volatile → 0.20.
  // CoV scaling: 0% → 0.65, 5% → 0.40, ≥15% → 0.20.
  const cov = market ? market.trailingStdCents / Math.max(1e-6, market.trailingAvgCents) : null;
  const variableScore = cov == null ? 0.25 : Math.max(0.2, 0.65 - cov * 3);
  const stabilityScore = (rt: PlanForScoring["rate_type"]) => {
    if (rt === "Fixed") return 1;
    if (rt === "Variable") return variableScore;
    return 0.5; // unknown — neutral
  };

  // Historical-pricing signal sourced from EIA: how far below the TX residential
  // trailing-12mo average is this plan's effective cents/kWh? Output 0..1 where
  // 1 = ≥20% below avg, 0 = at-or-above avg. Returned alongside `marketDelta`
  // (the raw diagnostic ratio) so the UI can show the underlying number.
  const marketDeltaScore = (effectiveCents: number): number | null => {
    if (!market || market.trailingAvgCents <= 0) return null;
    const ratio = (market.trailingAvgCents - effectiveCents) / market.trailingAvgCents;
    if (ratio <= 0) return 0;
    return Math.min(1, ratio / 0.2);
  };

  // Weather-forecast axis is a deliberate stub at 0.5 (neutral) until the
  // forecast pipeline is wired. Surfacing the slider now reserves the shape of
  // the API so we can fill it in without breaking saved weights.
  const weatherScore = (_plan: PlanForScoring) => 0.5;

  // Ratings: placeholder neutral 0.5. We strip JD Power because it's stale
  // (2012 vintage in some rows). Real signal will come from a future
  // user-review aggregation table.
  const ratingScore = (_plan: PlanForScoring) => 0.5;

  // Device-based score tweaks. Modest by design — these are *priors*, not
  // hard filters. EV / battery owners benefit from off-peak rate windows, so
  // we nudge time-of-use plans up; solar owners get a small uplift on plans
  // with no minimum-usage fee (so they aren't penalized in low-export months).
  const hasEvOrStorage = devices.includes("ev") || devices.includes("storage");
  const hasSolar = devices.includes("solar");
  const deviceUplift = (plan: PlanForScoring): number => {
    let u = 0;
    if (hasEvOrStorage && plan.time_of_use) u += 0.04;
    if (hasSolar && !plan.has_minimum_usage_fee) u += 0.02;
    return u;
  };

  // ----- Composite + reasons -----
  const ranked: RankedPlan[] = priced.map((r) => {
    const effectiveCentsPerKwh = usageKwh > 0 ? Math.round((r.monthlyUsd / usageKwh) * 1000) / 10 : 0;
    const md = marketDeltaScore(effectiveCentsPerKwh);
    // Historical pricing is its own axis now. When EIA data is unavailable we
    // fall back to 0.5 (neutral) so the axis contributes a tie value rather
    // than dragging scores down.
    const histPricing = md ?? 0.5;

    const breakdown: Breakdown = {
      cost: costScore(r.monthlyUsd),
      renewable: renewScore(r.renewablePct),
      contractFlexibility: flexScore(r.etfUsd, r.termMonths),
      rateStability: stabilityScore(r.rateType),
      ratings: ratingScore(r.plan),
      historicalPricing: histPricing,
      weatherForecast: weatherScore(r.plan),
      marketDelta: md,
    };

    const composite =
      breakdown.cost * w.cost +
      breakdown.renewable * w.renewable +
      breakdown.contractFlexibility * w.contractFlexibility +
      breakdown.rateStability * w.rateStability +
      breakdown.ratings * w.ratings +
      breakdown.historicalPricing * w.historicalPricing +
      breakdown.weatherForecast * w.weatherForecast +
      deviceUplift(r.plan);

    const creditAssessment = assessBillCredits(usageKwh, r.plan.bill_credits);
    return {
      plan: r.plan,
      score: composite,
      estMonthlyBillUsd: round2(r.monthlyUsd),
      estAnnualCostUsd: round2(r.monthlyUsd * MONTHS_PER_YEAR),
      effectiveCentsPerKwh,
      costSource: r.costSource,
      creditAssessment,
      breakdown,
      reasons: buildReasons(r.plan, r.monthlyUsd, breakdown, minCost, maxCost, creditAssessment, market, effectiveCentsPerKwh),
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}

function normalizeWeights(weights: Weights): Required<Weights> {
  const merged = { ...DEFAULT_WEIGHTS, ...weights };
  const total =
    merged.cost +
    merged.renewable +
    merged.contractFlexibility +
    merged.rateStability +
    merged.ratings +
    merged.historicalPricing +
    merged.weatherForecast;
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  return {
    cost: merged.cost / total,
    renewable: merged.renewable / total,
    contractFlexibility: merged.contractFlexibility / total,
    rateStability: merged.rateStability / total,
    ratings: merged.ratings / total,
    historicalPricing: merged.historicalPricing / total,
    weatherForecast: merged.weatherForecast / total,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildReasons(
  plan: PlanForScoring,
  monthlyUsd: number,
  breakdown: Breakdown,
  minCost: number,
  maxCost: number,
  credit: import("./types.ts").CreditAssessment | null,
  market: MarketContext | null,
  effectiveCentsPerKwh: number,
): string[] {
  const reasons: string[] = [];

  if (plan.renewable_pct != null && plan.renewable_pct >= 80) {
    reasons.push(`${plan.renewable_pct}% renewable energy`);
  }
  if (plan.rate_type === "Fixed" && (plan.term_months ?? 0) >= 12) {
    reasons.push(`Fixed rate locked for ${plan.term_months} months`);
  }
  if ((plan.etf_amount ?? 0) === 0 && plan.term_months != null && plan.term_months <= 1) {
    reasons.push("Month-to-month — no termination fee");
  }
  // Bill credit: surface only when meaningful AND reliable. Cliff plans get
  // a warning string further down instead.
  if (credit && credit.amount >= 25 && credit.status === "safe") {
    reasons.push(`$${credit.amount} bill credit kicks in at ${credit.threshold_kwh.toLocaleString()}+ kWh`);
  }
  if (breakdown.contractFlexibility >= 0.85) {
    reasons.push("Low contract burden");
  }
  // Cliff warning — high priority. Pushed last so it's seen even when slicing
  // to 3 because we sort it to the front below.
  if (credit && (credit.status === "cliff" || credit.status === "marginal")) {
    const verb = credit.status === "cliff" ? "miss" : "barely clear";
    reasons.unshift(
      `⚠ $${credit.amount} bill credit needs ${credit.threshold_kwh.toLocaleString()}+ kWh — you may ${verb} it most months`,
    );
  }
  return reasons.slice(0, 3); // keep UI tight
}
