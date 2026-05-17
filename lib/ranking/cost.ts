import type { PlanForScoring } from "./types.ts";

/** Probability that a plan's bill-credit threshold is met in a typical month,
 *  given the user's stated average usage. TX residential usage varies by
 *  roughly ±15% month-to-month around the annual mean, so we model the
 *  credit-qualifying probability as a linear ramp across a ±15% margin
 *  centered on the threshold. This is a close approximation of a normal CDF
 *  with stdev = 15% × mean.
 *
 *  Returns 0..1. A value < 0.5 means "you'd miss the credit more often than
 *  you'd hit it" — i.e. classic bill-credit-cliff territory. */
export function creditReliability(usageKwh: number, thresholdKwh: number): number {
  if (usageKwh <= 0) return 0;
  const margin = Math.max(50, usageKwh * 0.15); // floor at 50 kWh so very low usage isn't over-confident
  const lo = thresholdKwh - margin;
  const hi = thresholdKwh + margin;
  if (usageKwh >= hi) return 1;
  if (usageKwh <= lo) return 0;
  return (usageKwh - lo) / (hi - lo);
}

export type CreditAssessment = {
  threshold_kwh: number;
  amount: number;
  reliability: number;             // 0..1, P(qualify in a typical month)
  expected_value_per_month: number; // amount × reliability
  /** UI bucket. "safe" = reliability ≥ 0.9; "marginal" 0.5–0.9; "cliff" 0.1–0.5;
   *  "unreachable" < 0.1 (credit effectively never applies). */
  status: "safe" | "marginal" | "cliff" | "unreachable";
};

export function assessBillCredits(
  usageKwh: number,
  credits: PlanForScoring["bill_credits"],
): CreditAssessment | null {
  if (!credits) return null;
  const reliability = creditReliability(usageKwh, credits.threshold_kwh);
  const expected = credits.amount * reliability;
  const status: CreditAssessment["status"] =
    reliability >= 0.9 ? "safe"
    : reliability >= 0.5 ? "marginal"
    : reliability >= 0.1 ? "cliff"
    : "unreachable";
  return {
    threshold_kwh: credits.threshold_kwh,
    amount: credits.amount,
    reliability,
    expected_value_per_month: expected,
    status,
  };
}

/** Compute the projected monthly bill (USD) for a plan at a given kWh.
 *
 * Preferred path uses parsed EFL components:
 *   bill = usage_kwh × energy_cents/100
 *        + base_charge
 *        + usage_kwh × tdu_per_kwh_cents/100
 *        + tdu_per_month_usd
 *        - bill_credit (if usage_kwh ≥ threshold)
 *        + minimum_usage_fee (if usage_kwh below typical threshold ~1000)
 *
 * Fallback path uses PTC's published "average price per kWh" at the bracket
 * closest to the user's usage. PTC's number already includes TDU pass-throughs,
 * so when we use it we don't add TDU charges again — that's the key reason
 * costSource is reported alongside the number.
 */
export function estimateMonthlyBill(
  plan: PlanForScoring,
  usageKwh: number,
): { usd: number; source: "parsed_efl" | "ptc_headline" } | null {
  const parsed = tryParsedBill(plan, usageKwh);
  if (parsed != null) return { usd: parsed, source: "parsed_efl" };

  const headline = tryHeadlineBill(plan, usageKwh);
  if (headline != null) return { usd: headline, source: "ptc_headline" };

  return null;
}

function tryParsedBill(plan: PlanForScoring, usageKwh: number): number | null {
  // Need at minimum an energy charge to use the parsed path.
  const energyCents = plan.energy_charge?.cents_per_kwh;
  if (energyCents == null) return null;

  let bill = (usageKwh * energyCents) / 100;
  bill += plan.base_charge ?? 0;
  bill += ((plan.tdu_charges?.per_kwh_cents ?? 0) * usageKwh) / 100;
  bill += plan.tdu_charges?.per_month_usd ?? 0;

  // Probabilistic bill credit: apply credit × reliability rather than the
  // old binary "qualify or not" rule. This stops cliff-prone plans (credit
  // threshold right at the user's stated usage) from dominating ranking on
  // savings they'd only realize half the time.
  if (plan.bill_credits) {
    const reliability = creditReliability(usageKwh, plan.bill_credits.threshold_kwh);
    bill -= plan.bill_credits.amount * reliability;
  }

  // Many EFLs charge a minimum-usage fee when usage falls below a threshold.
  // We don't have the parsed threshold per plan; use 1000 kWh as the common
  // industry default. This is approximate — fine for ranking, not for exact
  // billing.
  if (plan.minimum_usage_fee != null && usageKwh < 1000) {
    bill += plan.minimum_usage_fee;
  }

  return Math.max(0, bill);
}

function tryHeadlineBill(plan: PlanForScoring, usageKwh: number): number | null {
  // Pick the PTC tier closest to the user's usage.
  const choices = (
    [
      { kwh: 500, cents: plan.rate_500_kwh },
      { kwh: 1000, cents: plan.rate_1000_kwh },
      { kwh: 2000, cents: plan.rate_2000_kwh },
    ] as { kwh: number; cents: number | null }[]
  ).filter((c): c is { kwh: number; cents: number } => c.cents != null);
  if (choices.length === 0) return null;

  // Closest bracket wins. (We could interpolate, but PTC's "avg ¢/kWh"
  // already bakes in tiered pricing for each bracket, so a closest-match is
  // more honest than a linear extrapolation.)
  let best = choices[0];
  for (const c of choices) {
    if (Math.abs(c.kwh - usageKwh) < Math.abs(best.kwh - usageKwh)) best = c;
  }
  return (usageKwh * best.cents) / 100;
}
