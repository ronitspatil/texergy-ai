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
  tdu_id: number;
  tdu_code: string;

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

export type RankedPlan = {
  plan: PlanForScoring;
  score: number; // 0..1 composite
  estMonthlyBillUsd: number; // at the user's monthly kWh
  estAnnualCostUsd: number;
  costSource: "parsed_efl" | "ptc_headline"; // which path produced the cost
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
