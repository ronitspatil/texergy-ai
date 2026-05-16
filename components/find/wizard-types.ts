export type Mode = "smart" | "basic";

export type RateTypePref = "any" | "Fixed" | "Variable" | "Indexed";
export type RenewablePref = "any" | "atleast50" | "atleast90" | "only100";
export type TermPref = "any" | "monthToMonth" | "short" | "medium" | "long";

/** Weight values are 0–100 in the UI for easy slider handling; we normalize
 *  inside the recommend call so they sum to 1 internally. */
export type WeightsUI = {
  cost: number;
  renewable: number;
  contractFlexibility: number;
  rateStability: number;
  ratings: number;
};

export type WizardState = {
  zip: string;
  mode: Mode | null;
  monthlyUsageKwh: number;
  rateTypePref: RateTypePref;
  renewablePref: RenewablePref;
  termPref: TermPref;
  weights: WeightsUI;
  stepIndex: number;
};
