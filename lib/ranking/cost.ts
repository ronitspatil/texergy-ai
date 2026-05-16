import type { PlanForScoring } from "./types.ts";

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

  if (plan.bill_credits && usageKwh >= plan.bill_credits.threshold_kwh) {
    bill -= plan.bill_credits.amount;
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
