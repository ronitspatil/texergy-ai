// Types shared across the ranking engine. Keep this file dependency-free so
// it can be imported from server, edge, or client code without dragging in
// supabase-js etc.

export type RateType = "Fixed" | "Variable" | "Indexed";

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
  ratings: number;
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
  /** Cap on base charge in $/mo. 0 = "$0 base charge only". Plans with no
   *  parsed base_charge (NULL) are included as a benefit-of-the-doubt. */
  maxBaseCharge: number;
  /** Cap on ETF in $. 0 = "no ETF" / month-to-month. Plans with no parsed
   *  etf_amount (NULL) are included. */
  maxEtf: number;
}>;

export type RecommendInput = {
  zip: string;
  monthlyUsageKwh: number; // defaults to 1000 if caller doesn't supply
  weights?: Weights;
  filters?: Filters;
  limit?: number; // top-N to return, defaults to 10
};

export type Breakdown = {
  cost: number;
  renewable: number;
  contractFlexibility: number;
  rateStability: number;
  ratings: number;
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
  cost: 0.5,
  renewable: 0.1,
  contractFlexibility: 0.15,
  rateStability: 0.15,
  ratings: 0.1,
};

export const DEFAULT_USAGE_KWH = 1000;
