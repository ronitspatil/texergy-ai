// Types shared across the ranking engine. Keep this file dependency-free so
// it can be imported from server, edge, or client code without dragging in
// supabase-js etc.

export type RateType = "Fixed" | "Variable";

/** Persisted plan + parsed EFL details, joined and flattened for scoring. */
export type PlanForScoring = {
  id: number;
  ptc_id: string;
  name: string;
  rep_id: number;
  rep_name: string;
  rep_logo_url: string | null;
  tdu_id: number;
  tdu_code: string;

  time_of_use: boolean;
  simple_plan: boolean;
  new_customer_only: boolean;
  has_minimum_usage_fee: boolean;

  rate_type: RateType | null;
  term_months: number | null;
  prepaid: boolean;
  renewable_pct: number | null;

  // PTC's headline averages — fallback when plan_details is missing.
  rate_500_kwh: number | null;
  rate_1000_kwh: number | null;
  rate_2000_kwh: number | null;

  // Parsed EFL fields. Null when EFL hasn't been parsed (yet) or parser failed.
  base_charge: number | null;
  etf_amount: number | null;
  minimum_usage_fee: number | null;
  energy_charge: { type: "flat"; cents_per_kwh: number } | null;
  tdu_charges: { per_kwh_cents: number | null; per_month_usd: number | null } | null;
  bill_credits: { amount: number; threshold_kwh: number } | null;

  efl_url: string | null;
  tos_url: string | null;
  yrac_url: string | null;
  enroll_url: string | null;
};

/** Weights given to each scoring factor. Caller-friendly: any subset accepted,
 *  missing keys fall back to defaults. Internally normalized so total = 1. */
export type Weights = Partial<{
  cost: number;
  renewable: number;
  contractFlexibility: number;
  rateStability: number;
  billTransparency: number;
  /** How much the plan beats the EIA TX-residential trailing-12mo average. */
  historicalPricing: number;
  /** Placeholder for seasonal / forecast-driven biasing. Neutral until the
   *  forecast pipeline is wired up. */
  weatherForecast: number;
}>;

/** Hard filters — applied before scoring to prune the candidate set. */
export type Filters = Partial<{
  rateType: RateType;
  minRenewablePct: number;
  maxTermMonths: number;
  prepaidOnly: boolean;
  excludePrepaid: boolean;
  maxMonthlyBill: number;
  timeOfUseOnly: boolean;
  /** Exclude any plan with time_of_use=true. Mutually exclusive with
   *  timeOfUseOnly — caller should set only one. */
  excludeTimeOfUse: boolean;
  /** Restrict candidates to this set of REP (rep_id) ids. Empty/undefined =
   *  no restriction. */
  providerIds: number[];
  /** Cap on base charge in $/mo. 0 = "$0 base charge only". Plans with no
   *  parsed base_charge (NULL) are included as a benefit-of-the-doubt. */
  maxBaseCharge: number;
  /** Cap on ETF in $. 0 = "no ETF" / month-to-month. Plans with no parsed
   *  etf_amount (NULL) are included. */
  maxEtf: number;
}>;

export type DeviceFlag = "thermostat" | "ev" | "solar" | "storage";

export type RecommendInput = {
  zip: string;
  monthlyUsageKwh: number; // defaults to 1000 if caller doesn't supply
  weights?: Weights;
  filters?: Filters;
  /** Optional household-device flags. Used to bias ranking: EV/storage owners
   *  see a soft boost on time-of-use plans; solar owners on flexible terms. */
  devices?: DeviceFlag[];
  limit?: number; // top-N to return, defaults to 10
};

export type Breakdown = {
  cost: number;
  renewable: number;
  contractFlexibility: number;
  rateStability: number;
  billTransparency: number;
  /** Historical-pricing axis: how far below the EIA TX-residential trailing-12mo
   *  average this plan's effective rate is. 0..1 where 1 = ≥20% below avg.
   *  Falls back to 0.5 (neutral) when no market context is available, so the
   *  axis still contributes a tie value rather than dragging scores down. */
  historicalPricing: number;
  /** Weather-forecast axis. Placeholder neutral 0.5 until the forecast feed
   *  is wired. */
  weatherForecast: number;
  /** Raw EIA-vs-plan ratio for diagnostics. Null when no market context. */
  marketDelta: number | null;
};

/** Trailing market context derived from EIA. Passed into scoreAndRank so each
 *  plan can be compared against a real, time-anchored baseline instead of just
 *  the local candidate set. Null = degrade gracefully (no market signal). */
export type MarketContext = {
  trailingAvgCents: number;
  trailingStdCents: number;
  trailing6moSlopeCentsPerMonth: number;
  latestPeriod: string | null;
};

/** Per-month seasonal context for weatherForecast scoring. Indexed Jan=0..Dec=11.
 *  Higher monthlyVolatilityWeights[i] = historically more expensive/volatile.
 *  Derived from a hardcoded TX prior + EIA monthly aggregates. */
export type SeasonalContext = {
  monthlyVolatilityWeights: number[];
  empiricallyAnchored: boolean;
};

export type CreditAssessment = {
  threshold_kwh: number;
  amount: number;
  reliability: number;
  expected_value_per_month: number;
  status: "safe" | "marginal" | "cliff" | "unreachable";
};

export type RankedPlan = {
  plan: PlanForScoring;
  score: number; // 0..1 composite
  estMonthlyBillUsd: number; // at the user's monthly kWh
  estAnnualCostUsd: number;
  effectiveCentsPerKwh: number; // all-in cost per kWh = estMonthlyBillUsd / usageKwh * 100
  costSource: "parsed_efl" | "ptc_headline"; // which path produced the cost
  creditAssessment: CreditAssessment | null;
  breakdown: Breakdown;
  reasons: string[]; // human-readable highlights for the UI
};

export const DEFAULT_WEIGHTS: Required<Weights> = {
  cost: 0.4,
  renewable: 0.1,
  contractFlexibility: 0.15,
  rateStability: 0.15,
  billTransparency: 0.1,
  historicalPricing: 0.1,
  weatherForecast: 0,
};

export const DEFAULT_USAGE_KWH = 1000;
