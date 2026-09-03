import type { RankedPlan } from "@/lib/ranking/types";
import type { RecommendBody } from "@/lib/validation";
import type {
  BaseChargePref,
  EtfPref,
  RateTypePref,
  RenewablePref,
  TermPref,
  TimeOfUsePref,
  WizardState,
} from "./wizard-types";

export type ApiResponse = {
  ranked: RankedPlan[];
  tduCodes: string[];
  candidateCount: number;
  profile: {
    source: "meter_api" | "bundled_static";
    weatherZone: string;
    profileType: string;
  } | null;
};

/** Convert wizard UI state into the POST body the /api/recommend route expects.
 *  Pref questions narrow the candidate set; the weights drive the ranking
 *  within whatever survives. */
export function buildRecommendBody(state: WizardState): RecommendBody {
  const body: RecommendBody = {
    zip: state.zip,
    monthlyUsageKwh: state.monthlyUsageKwh,
    limit: 1000,
  };
  if (state.devices && state.devices.length > 0) {
    body.devices = [...state.devices];
  }

  const filters = buildFilters(
    state.rateTypePref,
    state.renewablePref,
    state.termPref,
    state.timeOfUsePref,
    state.baseChargePref,
    state.etfPref,
  );
  if (state.providerIds && state.providerIds.length > 0) {
    filters.providerIds = [...state.providerIds];
  }
  if (Object.keys(filters).length > 0) body.filters = filters;

  body.weights = {
    cost: state.weights.cost / 100,
    renewable: state.weights.renewable / 100,
    contractFlexibility: state.weights.contractFlexibility / 100,
    rateStability: state.weights.rateStability / 100,
    billTransparency: state.weights.billTransparency / 100,
    historicalPricing: state.weights.historicalPricing / 100,
    weatherForecast: state.weights.weatherForecast / 100,
  };

  return body;
}

function buildFilters(
  rate: RateTypePref,
  renew: RenewablePref,
  term: TermPref,
  tou: TimeOfUsePref,
  base: BaseChargePref,
  etf: EtfPref,
): NonNullable<RecommendBody["filters"]> {
  const out: NonNullable<RecommendBody["filters"]> = {};
  // A non-"any" pick is a hard filter — the user opted in to that strictness.
  if (rate !== "any") out.rateType = rate;

  if (renew === "atleast25") out.minRenewablePct = 25;
  else if (renew === "atleast50") out.minRenewablePct = 50;
  else if (renew === "atleast90") out.minRenewablePct = 90;
  else if (renew === "only100") out.minRenewablePct = 100;

  // "long" (24+ mo) has no server-side filter today, so it stays unset.
  if (term === "monthToMonth") out.maxTermMonths = 1;
  else if (term === "short") out.maxTermMonths = 6;
  else if (term === "medium") out.maxTermMonths = 12;

  if (tou === "only") out.timeOfUseOnly = true;
  else if (tou === "none") out.excludeTimeOfUse = true;

  if (base === "zero") out.maxBaseCharge = 0;
  else if (base === "atmost5") out.maxBaseCharge = 5;
  else if (base === "atmost10") out.maxBaseCharge = 10;

  if (etf === "none") out.maxEtf = 0;
  else if (etf === "atmost100") out.maxEtf = 100;
  else if (etf === "atmost200") out.maxEtf = 200;

  return out;
}
