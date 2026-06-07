export type Mode = "smart" | "basic" | "meter";

export type RateTypePref = "any" | "Fixed" | "Variable";
export type RenewablePref = "any" | "atleast25" | "atleast50" | "atleast90" | "only100";
export type TermPref = "any" | "monthToMonth" | "short" | "medium" | "long";
export type TimeOfUsePref = "any" | "only" | "none";
export type BaseChargePref = "any" | "zero" | "atmost5" | "atmost10";
export type EtfPref = "any" | "none" | "atmost100" | "atmost200";

/** Optional household-device flags collected on the profile step. Used to
 *  bias the ranking — e.g. an EV or battery storage owner benefits from a
 *  time-of-use plan, a solar customer cares about minimum-usage fees. Empty
 *  array means "I don't have any of these". */
export type DeviceFlag = "thermostat" | "ev" | "solar" | "storage";

export const DEVICE_OPTIONS: { value: DeviceFlag; label: string }[] = [
  { value: "thermostat", label: "Smart Thermostat" },
  { value: "ev", label: "Electric Vehicle" },
  { value: "solar", label: "Solar" },
  { value: "storage", label: "Generator or Battery Storage" },
];

export type SortBy = "score" | "rate" | "term" | "bill" | "etf";

export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "score", label: "Match (best fit)" },
  { value: "rate", label: "Rate (low–high)" },
  { value: "term", label: "Term length (low–high)" },
  { value: "bill", label: "Estimated bill (low–high)" },
  { value: "etf", label: "Termination fee (low–high)" },
];

/** Weight values are 0–100 in the UI for easy slider handling; we normalize
 *  inside the recommend call so they sum to 1 internally. */
export type WeightsUI = {
  cost: number;
  renewable: number;
  contractFlexibility: number;
  rateStability: number;
  billTransparency: number;
  historicalPricing: number;
  weatherForecast: number;
};

/** One month of the WattBuy 12-month forecast. `cost` is null when WattBuy
 *  didn't return a monthly_cost entry for that index. */
export type UsageGraphPoint = { month: string; kwh: number; cost: number | null };

/** Normalized WattBuy usage estimate, mirrored from /api/usage-estimate.
 *  Stored on the wizard so the profile step, sidebar, and results graph can
 *  all read the same forecast without re-fetching. */
export type UsageEstimate = {
  stateName: string | null;
  estUsageAnnualKwh: number;
  monthlyAvgKwh: number;
  avgMonthlyCost: number | null;
  estBill: { min: number; max: number } | null;
  interpolated: boolean;
  graph: UsageGraphPoint[];
};

export type WizardState = {
  zip: string;
  mode: Mode | null;
  monthlyUsageKwh: number;
  /** Full WattBuy forecast once the user runs the estimator; null otherwise. */
  usageEstimate: UsageEstimate | null;
  rateTypePref: RateTypePref;
  renewablePref: RenewablePref;
  termPref: TermPref;
  timeOfUsePref: TimeOfUsePref;
  baseChargePref: BaseChargePref;
  etfPref: EtfPref;
  devices: DeviceFlag[];
  providerIds: number[];
  sortBy: SortBy;
  weights: WeightsUI;
  stepIndex: number;
};
