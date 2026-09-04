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
 *
 * The parsed path is only trusted when it survives two checks: the EFL must
 * have yielded a TDU delivery rate (see tryParsedBill), and the resulting bill
 * must not come in implausibly far under PTC's published all-in average (see
 * parsedLooksPlausible). Both exist because an EFL parse that silently drops
 * the delivery charges understates a Texas bill by roughly half, and cost is
 * the dominant ranking factor — an understated plan sweeps the top of the
 * results. When the parsed number fails either check we fall back to the PTC
 * headline; when there's no headline to fall back to we return null and the
 * caller drops the plan rather than rank it on a number we don't believe.
 */
export function estimateMonthlyBill(
  plan: PlanForScoring,
  usageKwh: number,
): { usd: number; source: CostSource } | null {
  for (const source of ["parsed_efl", "efl_tdu_default"] as const) {
    const bill = tryParsedBill(plan, usageKwh, source);
    if (bill != null && parsedLooksPlausible(plan, source)) {
      return { usd: bill, source };
    }
  }

  const headline = tryHeadlineBill(plan, usageKwh);
  if (headline != null) return { usd: headline, source: "ptc_headline" };

  return null;
}

type CostSource = "parsed_efl" | "efl_tdu_default" | "ptc_headline";

/** The delivery charge to price a plan with, under a given costing strategy.
 *
 *  "parsed_efl" uses only what the plan's own EFL yielded — null when the parse
 *  lost the delivery table, which sends the caller to the next strategy.
 *  "efl_tdu_default" substitutes the canonical charge for the plan's TDU: it is
 *  the same regulated pass-through for every REP in that territory, so it is
 *  the right number, just not one this EFL happened to state. */
function deliveryChargeFor(
  plan: PlanForScoring,
  source: "parsed_efl" | "efl_tdu_default",
): { perKwhCents: number; perMonthUsd: number } | null {
  if (source === "parsed_efl") {
    const perKwhCents = plan.tdu_charges?.per_kwh_cents;
    if (perKwhCents == null) return null;
    return { perKwhCents, perMonthUsd: plan.tdu_charges?.per_month_usd ?? 0 };
  }
  const fallback = plan.tdu_default_charges;
  if (fallback == null) return null;
  return { perKwhCents: fallback.per_kwh_cents, perMonthUsd: fallback.per_month_usd };
}

/** How far under PTC's published average a parsed bill may land before we stop
 *  believing it. PTC's "average price per kWh" is all-in (energy + delivery +
 *  base charge), so a correct parse tracks it closely; the gap that remains is
 *  legitimate modeling difference — chiefly our probabilistic bill credits,
 *  which PTC applies as a hard threshold. 15% covers that and still catches a
 *  dropped TDU table, which costs ~50%. */
const PARSED_UNDERSHOOT_TOLERANCE = 0.15;

/** How far *over* the published average a parsed bill may land, for plans where
 *  we have no bill credit to explain the gap. Deliberately loose — it only has
 *  to catch a garbled component, not police small differences. Real examples it
 *  rejects: a $130 "base charge" that is plainly a misparsed ETF, which prices
 *  1000 kWh at 33.9¢ against a published 11.5¢. */
const PARSED_OVERSHOOT_TOLERANCE = 0.4;

/** Cross-check the parsed components against PTC's published all-in average.
 *
 * Compares at PTC's own bracket rather than the user's usage, so both sides
 * price the same number of kWh and the bracket-snapping in tryHeadlineBill
 * can't skew the comparison.
 *
 * Asymmetric on purpose. Undershooting is always suspect: dropped delivery
 * charges or a misread tier, and it inflates the plan's rank. Overshooting is
 * only suspect when nothing explains it — on a bill-credit plan our number
 * *should* run high, because we apply the credit times the probability of
 * qualifying while PTC assumes it always lands, and that conservatism is the
 * point of assessBillCredits. So the ceiling applies only to plans with no
 * credit parsed, where a large gap means a garbled component rather than a
 * modeling difference.
 *
 * Returns true when there's no headline to check against; that case is handled
 * by the delivery-charge gate in tryParsedBill instead. */
function parsedLooksPlausible(
  plan: PlanForScoring,
  source: "parsed_efl" | "efl_tdu_default",
): boolean {
  const bracket = nearestHeadlineBracket(plan, 1000);
  if (bracket == null) return true;

  const parsedAtBracket = tryParsedBill(plan, bracket.kwh, source);
  if (parsedAtBracket == null) return true;

  const headlineAtBracket = (bracket.kwh * bracket.cents) / 100;
  if (headlineAtBracket <= 0) return true;

  if (parsedAtBracket < headlineAtBracket * (1 - PARSED_UNDERSHOOT_TOLERANCE)) return false;

  const hasCredit = (plan.bill_credits?.amount ?? 0) > 0;
  if (!hasCredit && parsedAtBracket > headlineAtBracket * (1 + PARSED_OVERSHOOT_TOLERANCE)) {
    return false;
  }
  return true;
}

function tryParsedBill(
  plan: PlanForScoring,
  usageKwh: number,
  source: "parsed_efl" | "efl_tdu_default",
): number | null {
  // Need at minimum an energy charge to use the parsed path. TOU plans can't
  // be priced honestly without a usage shape — defer them to the profile-aware
  // path (estimateAnnualBillFromProfile) or the PTC headline fallback.
  const e = plan.energy_charge;
  if (!e) return null;
  if (e.type !== "flat") return null;
  const energyCents = e.cents_per_kwh;
  if (energyCents == null) return null;

  // Every Texas TDU bills a volumetric delivery charge, so a parse that didn't
  // find one didn't read the delivery table — it did not discover a plan with
  // free delivery. Pricing it as free understates the bill by roughly half, so
  // this returns null and the caller moves on to the TDU's canonical charge,
  // then to the PTC headline. A missing per-month charge alone is worth ~$4/mo
  // and stays on this path; the headline cross-check catches it if it's worse.
  const delivery = deliveryChargeFor(plan, source);
  if (delivery == null) return null;

  let bill = (usageKwh * energyCents) / 100;
  bill += plan.base_charge ?? 0;
  bill += (delivery.perKwhCents * usageKwh) / 100;
  bill += delivery.perMonthUsd;

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
  source: CostSource;
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
  let source: CostSource | null = null;

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
  // Same delivery-charge resolution as the flat path: the plan's own EFL when
  // it parsed, otherwise the TDU's canonical charge. Null on both sends the
  // plan to the PTC headline via estimateMonthlyBill. We don't cross-check the
  // TOU result against the headline afterwards: a Free Nights plan genuinely
  // prices well below PTC's flat average for a night-heavy profile, so the
  // undershoot test would reject correct math.
  const delivery =
    deliveryChargeFor(plan, "parsed_efl") ?? deliveryChargeFor(plan, "efl_tdu_default");
  if (delivery == null) return null;
  const touSource: CostSource =
    plan.tdu_charges?.per_kwh_cents != null ? "parsed_efl" : "efl_tdu_default";

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
    bill += (delivery.perKwhCents * monthKwh) / 100;
    bill += delivery.perMonthUsd;
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
    source: touSource,
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

/** PTC's published bracket closest to a given usage, or null when the plan
 *  carries no published average at all. */
function nearestHeadlineBracket(
  plan: PlanForScoring,
  usageKwh: number,
): { kwh: number; cents: number } | null {
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
  return best;
}

function tryHeadlineBill(plan: PlanForScoring, usageKwh: number): number | null {
  const bracket = nearestHeadlineBracket(plan, usageKwh);
  if (bracket == null) return null;
  return (usageKwh * bracket.cents) / 100;
}
