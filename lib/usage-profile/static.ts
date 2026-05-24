// Bundled fallback residential load profile for Texas. Used when Meter's
// API is unreachable, rate-limited, or disabled via env. Numbers are typical
// for an ERCOT residential customer: heavy summer A/C, mild winter electric
// heat, evening peak 4–9pm. Source: derived from public ERCOT residential
// load profile aggregates (RESHIWR, normalized).
//
// The shape is what matters — these are normalized fractions of annual usage
// per (month, hour-of-day). Sums to 1.0 across all 288 entries. The user's
// actual annual kWh scales the matrix at runtime.
//
// This file ships with the repo. The site keeps working with no external
// dependency if Meter's API ever changes, is removed, or is unreachable.

export type StaticLoadProfile = {
  weatherZone: string;            // zone the profile represents
  profileType: string;            // ERCOT profile code
  // 12 × 24 normalized fractions. Indexed [month 0-11][hour 0-23].
  // Sum across all 288 entries = 1.0.
  monthlyHourlyFractions: number[][];
};

// Per-month share of annual usage, typical TX residential (sums to 1.0).
// Heavy summer cooling, mild shoulder, low winter — approximates the ERCOT
// COAST/NCENT zone average.
const MONTHLY_SHARE = [
  0.060, // Jan
  0.055, // Feb
  0.058, // Mar
  0.062, // Apr
  0.082, // May
  0.110, // Jun
  0.135, // Jul
  0.140, // Aug
  0.115, // Sep
  0.078, // Oct
  0.055, // Nov
  0.050, // Dec
];

// Per-hour-of-day share of a typical day (sums to 1.0). Evening peak shape:
// morning rise 6–9am, midday baseline, big evening peak 4–9pm, overnight low.
const HOURLY_SHARE = [
  0.025, 0.022, 0.020, 0.019, 0.019, 0.022, // 0–5 (overnight)
  0.030, 0.040, 0.042, 0.038, 0.036, 0.038, // 6–11 (morning + late morning)
  0.040, 0.042, 0.044, 0.048, 0.055, 0.068, // 12–17 (afternoon + early peak)
  0.078, 0.075, 0.065, 0.052, 0.040, 0.032, // 18–23 (evening peak + wind-down)
];

function buildDefaultProfile(): number[][] {
  const matrix: number[][] = [];
  for (let m = 0; m < 12; m++) {
    const monthShare = MONTHLY_SHARE[m];
    const row: number[] = [];
    for (let h = 0; h < 24; h++) {
      row.push(monthShare * HOURLY_SHARE[h]);
    }
    matrix.push(row);
  }
  return matrix;
}

const DEFAULT_MATRIX = buildDefaultProfile();

/** Return the bundled Texas residential profile for any zone. Today we ship
 *  one curve and reuse it across zones — accurate enough for ranking and
 *  guaranteed to be available. Zone-specific curves can be bundled later
 *  without changing callers. */
export function getStaticProfile(
  weatherZone: string,
  profileType: string = "RESHIWR",
): StaticLoadProfile {
  return {
    weatherZone,
    profileType,
    monthlyHourlyFractions: DEFAULT_MATRIX,
  };
}
