import { estimateMonthlyBill } from "./cost.ts";
import {
  type Breakdown,
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

  // Rate stability: Fixed > Indexed > Variable, by user-research convention.
  const stabilityScore = (rt: PlanForScoring["rate_type"]) => {
    if (rt === "Fixed") return 1;
    if (rt === "Indexed") return 0.5;
    if (rt === "Variable") return 0.25;
    return 0.5; // unknown — neutral
  };

  // Ratings: placeholder neutral 0.5. We strip JD Power because it's stale
  // (2012 vintage in some rows). Real signal will come from a future
  // user-review aggregation table.
  const ratingScore = (_plan: PlanForScoring) => 0.5;

  // ----- Composite + reasons -----
  const ranked: RankedPlan[] = priced.map((r) => {
    const breakdown: Breakdown = {
      cost: costScore(r.monthlyUsd),
      renewable: renewScore(r.renewablePct),
      contractFlexibility: flexScore(r.etfUsd, r.termMonths),
      rateStability: stabilityScore(r.rateType),
      ratings: ratingScore(r.plan),
    };

    const composite =
      breakdown.cost * w.cost +
      breakdown.renewable * w.renewable +
      breakdown.contractFlexibility * w.contractFlexibility +
      breakdown.rateStability * w.rateStability +
      breakdown.ratings * w.ratings;

    return {
      plan: r.plan,
      score: composite,
      estMonthlyBillUsd: round2(r.monthlyUsd),
      estAnnualCostUsd: round2(r.monthlyUsd * MONTHS_PER_YEAR),
      costSource: r.costSource,
      breakdown,
      reasons: buildReasons(r.plan, r.monthlyUsd, breakdown, minCost, maxCost),
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
    merged.ratings;
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  return {
    cost: merged.cost / total,
    renewable: merged.renewable / total,
    contractFlexibility: merged.contractFlexibility / total,
    rateStability: merged.rateStability / total,
    ratings: merged.ratings / total,
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
): string[] {
  const reasons: string[] = [];
  const savingsVsAvg = (maxCost + minCost) / 2 - monthlyUsd;
  if (savingsVsAvg > 5) {
    reasons.push(`~$${Math.round(savingsVsAvg)}/mo less than the average plan in your area`);
  }
  if (plan.renewable_pct != null && plan.renewable_pct >= 80) {
    reasons.push(`${plan.renewable_pct}% renewable energy`);
  }
  if (plan.rate_type === "Fixed" && (plan.term_months ?? 0) >= 12) {
    reasons.push(`Fixed rate locked for ${plan.term_months} months`);
  }
  if ((plan.etf_amount ?? 0) === 0 && plan.term_months != null && plan.term_months <= 1) {
    reasons.push("Month-to-month — no termination fee");
  }
  if (plan.bill_credits && plan.bill_credits.amount >= 25) {
    reasons.push(
      `$${plan.bill_credits.amount} bill credit at ${plan.bill_credits.threshold_kwh}+ kWh`,
    );
  }
  if (breakdown.contractFlexibility >= 0.85) {
    reasons.push("Low contract burden");
  }
  return reasons.slice(0, 3); // keep UI tight
}
