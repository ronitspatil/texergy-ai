import type { RankedPlan } from "@/lib/ranking/types";
import type { RecommendBody } from "@/lib/validation";
import type {
  RateTypePref,
  RenewablePref,
  TermPref,
  WizardState,
} from "./wizard-types";

export type ApiResponse = {
  ranked: RankedPlan[];
  tduCodes: string[];
  candidateCount: number;
};

/** Convert wizard UI state into the POST body the /api/recommend route expects.
 *
 * In smart mode: pref questions stay soft (they tweak filters lightly), and
 * weights drive the ranking.
 * In basic mode: pref questions become hard filters; no weights are sent
 * (the API uses its defaults, but they barely matter since the candidate set
 * is already pruned to exactly what the user wants).
 */
export function buildRecommendBody(state: WizardState): RecommendBody {
  const body: RecommendBody = {
    zip: state.zip,
    monthlyUsageKwh: state.monthlyUsageKwh,
    limit: 20,
  };

  const filters = buildFilters(state.rateTypePref, state.renewablePref, state.termPref, state.mode === "basic");
  if (Object.keys(filters).length > 0) body.filters = filters;

  if (state.mode === "smart") {
    body.weights = {
      cost: state.weights.cost / 100,
      renewable: state.weights.renewable / 100,
      contractFlexibility: state.weights.contractFlexibility / 100,
      rateStability: state.weights.rateStability / 100,
      ratings: state.weights.ratings / 100,
    };
  }

  return body;
}

function buildFilters(
  rate: RateTypePref,
  renew: RenewablePref,
  term: TermPref,
  strict: boolean,
): NonNullable<RecommendBody["filters"]> {
  const out: NonNullable<RecommendBody["filters"]> = {};
  // Rate type: in basic mode it's a hard filter; in smart mode we *also*
  // treat a non-"any" pick as a filter — the user opted in to that strictness.
  if (rate !== "any") out.rateType = rate;

  if (renew === "atleast50") out.minRenewablePct = 50;
  else if (renew === "atleast90") out.minRenewablePct = 90;
  else if (renew === "only100") out.minRenewablePct = 100;

  if (term === "monthToMonth") out.maxTermMonths = 1;
  else if (term === "short") out.maxTermMonths = 6;
  else if (term === "medium") {
    // Smart mode keeps it as an upper bound; basic mode could also be exact.
    // Upper bound works for both since shorter terms are usually acceptable.
    out.maxTermMonths = 12;
  } else if (term === "long" && strict) {
    // No max term — we want long terms only. The API doesn't support a minimum
    // term filter today, so in smart mode this question's "long" answer just
    // raises rateStability bias implicitly via weights. Nothing to add here.
  }

  return out;
}
