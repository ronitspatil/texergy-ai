import type { PlanForScoring } from "./types.ts";
import type { UsageProfile } from "../usage-profile/index.ts";

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
  // Need at minimum an energy charge to use the parsed path. TOU plans can't
  // be priced honestly without a usage shape — defer them to the profile-aware
  // path (estimateAnnualBillFromProfile) or the PTC headline fallback.
  const e = plan.energy_charge;
  if (!e) return null;
  if (e.type !== "flat") return null;
  const energyCents = e.cents_per_kwh;
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

/** Project a 12-month bill array using the user's usage profile. Each month
 *  runs through the same per-month cost path as estimateMonthlyBill, so for
 *  flat-rate plans the annual total exactly matches 12 × estimateMonthlyBill
 *  at the equivalent average kWh. The improvement comes from evaluating
 *  bill credits, minimum-usage fees, and (later) TOU windows against the
 *  *actual* projected month, not the annual average.
 *
 *  Returns null when the plan can't be priced at all (matches the
 *  estimateMonthlyBill contract — caller drops it from the candidate set). */
export type AnnualBillFromProfile = {
  monthly: number[];
  annualUsd: number;
  source: "parsed_efl" | "ptc_headline";
  /** TOU only: fraction of annual kWh that landed in a zero-rate window
   *  (Free Nights, Free Weekends). 0..1. Null for flat plans. */
  freeWindowFraction: number | null;
};

export function estimateAnnualBillFromProfile(
  plan: PlanForScoring,
  profile: UsageProfile,
): AnnualBillFromProfile | null {
  if (profile.monthlyTotalsKwh.length !== 12) return null;

  // TOU plans honor the hourly shape — Free Nights / Free Weekends only make
  // sense when we know what % of usage lands in the free window.
  if (plan.energy_charge?.type === "tou") {
    return priceTouAnnualFromProfile(plan, profile);
  }

  const monthly: number[] = new Array(12).fill(0);
  let source: "parsed_efl" | "ptc_headline" | null = null;

  for (let m = 0; m < 12; m++) {
    const monthKwh = profile.monthlyTotalsKwh[m];
    const monthBill = estimateMonthlyBill(plan, monthKwh);
    // If any month can't be priced, the whole plan can't be priced honestly.
    if (monthBill == null) return null;
    monthly[m] = monthBill.usd;
    if (source == null) source = monthBill.source;
  }

  const annualUsd = monthly.reduce((a, b) => a + b, 0);
  return { monthly, annualUsd, source: source ?? "parsed_efl", freeWindowFraction: null };
}

/** Hour-by-hour integration for TOU plans. Walks the 12×24 profile, applies
 *  the rate that matches each hour (with day-mask weighting), then adds the
 *  same base + TDU + credit math the flat path uses. Also tracks the fraction
 *  of total kWh that landed in zero-rate windows, surfaced as a UI reason. */
function priceTouAnnualFromProfile(
  plan: PlanForScoring,
  profile: UsageProfile,
): AnnualBillFromProfile | null {
  if (plan.energy_charge?.type !== "tou") return null;
  const e = plan.energy_charge;
  if (e.default_cents_per_kwh == null) return null;

  const monthly: number[] = new Array(12).fill(0);
  let freeKwh = 0;
  let totalKwh = 0;

  for (let m = 0; m < 12; m++) {
    const monthKwh = profile.monthlyTotalsKwh[m];
    let bill = 0;
    for (let h = 0; h < 24; h++) {
      const kwh = profile.monthlyHourlyKwh[m][h];
      const rate = touRateAtHour(e, h);
      bill += (kwh * rate) / 100;
      totalKwh += kwh;
      // Effective free fraction at this hour: how much of the kWh at this
      // (m, h) cell is charged at 0¢. For an "all-days" window the answer
      // is 1.0 when in-window; for day-restricted windows we attribute by
      // the matching day-fraction (2/7 weekend, 5/7 weekday).
      const freeFracAtHour = freeFractionAtHour(e, h);
      freeKwh += kwh * freeFracAtHour;
    }
    bill += plan.base_charge ?? 0;
    bill += ((plan.tdu_charges?.per_kwh_cents ?? 0) * monthKwh) / 100;
    bill += plan.tdu_charges?.per_month_usd ?? 0;
    if (plan.bill_credits) {
      const reliability = creditReliability(monthKwh, plan.bill_credits.threshold_kwh);
      bill -= plan.bill_credits.amount * reliability;
    }
    if (plan.minimum_usage_fee != null && monthKwh < 1000) {
      bill += plan.minimum_usage_fee;
    }
    monthly[m] = Math.max(0, bill);
  }

  const freeWindowFraction = totalKwh > 0 ? freeKwh / totalKwh : 0;
  return {
    monthly,
    annualUsd: monthly.reduce((a, b) => a + b, 0),
    source: "parsed_efl",
    freeWindowFraction,
  };
}

/** Fraction of kWh at this hour that lands in a 0¢ window. Returns 0–1. */
function freeFractionAtHour(
  e: Extract<PlanForScoring["energy_charge"], { type: "tou" }>,
  hour: number,
): number {
  let frac = 0;
  for (const w of e.windows) {
    if (w.cents_per_kwh !== 0) continue;
    if (!hourInWindow(hour, w.start_hour, w.end_hour)) continue;
    // Convert day-mask to weekly fraction at this hour.
    const dayFrac = w.days === "all" ? 1 : w.days === "weekdays" ? 5 / 7 : 2 / 7;
    // Multiple overlapping free windows shouldn't double-count — clamp to 1.
    frac = Math.min(1, frac + dayFrac);
  }
  return frac;
}

/** Effective ¢/kWh for one hour-of-day, blending across day-types when a
 *  window is day-restricted. Since the profile gives hour-of-day but not
 *  day-of-week, we proxy: a weekend-only window applies 2/7 of the time at
 *  that hour, weekdays 5/7. First matching window wins. */
function touRateAtHour(
  e: Extract<PlanForScoring["energy_charge"], { type: "tou" }>,
  hour: number,
): number {
  const dflt = e.default_cents_per_kwh;
  for (const w of e.windows) {
    if (!hourInWindow(hour, w.start_hour, w.end_hour)) continue;
    if (w.days === "all") return w.cents_per_kwh;
    if (w.days === "weekdays") return (w.cents_per_kwh * 5 + dflt * 2) / 7;
    if (w.days === "weekends") return (w.cents_per_kwh * 2 + dflt * 5) / 7;
  }
  return dflt;
}

function hourInWindow(h: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (end > start) return h >= start && h < end;
  // Wraps midnight, e.g. 21 → 6 means 9pm–6am.
  return h >= start || h < end;
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
