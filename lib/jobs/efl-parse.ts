// Shared EFL regex parser. Tier A feeds it raw PDF text (from unpdf);
// Tier B feeds it LlamaParse markdown. Tier B accepts a wider pattern
// set (dollar-per-kWh, "Energy Rate"/"Energy Price" synonyms).

export type TouWindow = {
  /** Human-readable label surfaced in the UI ("Free Nights", "Free Weekends"). */
  label: string;
  /** Local-time hour [0, 23]. Half-open [start_hour, end_hour); end <= start
   *  means the window wraps midnight (e.g. 21 → 6 = 9pm to 6am). */
  start_hour: number;
  end_hour: number;
  /** Which days the window applies to. "weekends" = Sat+Sun; "weekdays" =
   *  Mon–Fri; "all" = every day. */
  days: "all" | "weekdays" | "weekends";
  cents_per_kwh: number;
};

export type EnergyCharge =
  | { type: "flat"; cents_per_kwh: number | null }
  | {
      type: "tou";
      /** Rate that applies to any hour NOT inside a window. Typically the
       *  "regular" / "peak" rate. */
      default_cents_per_kwh: number | null;
      windows: TouWindow[];
    };
export type TduCharges = { per_kwh_cents: number | null; per_month_usd: number | null };
export type BillCredits = { amount: number | null; threshold_kwh: number };

export type ParsedEfl = {
  base_charge: number | null;
  etf_amount: number | null;
  minimum_usage_fee: number | null;
  energy_charge: EnergyCharge | null;
  bill_credits: BillCredits | null;
  tdu_charges: TduCharges | null;
  raw_text: string | null;
  parse_errors: string[];
};

function firstMatch(text: string, patterns: RegExp[]): RegExpMatchArray | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m;
  }
  return null;
}

function toFloat(s: string | undefined | null): number | null {
  if (s == null) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Convert a 12-hour clock reading (e.g. "9", "pm") to a 0–23 hour. Returns
 *  null on garbage input. 12am → 0, 12pm → 12, 24-hour edge: "12 a.m. to 12 a.m."
 *  is treated as midnight-to-midnight rather than a zero-length window. */
function parseHour12(hourStr: string, ampm: string): number | null {
  const h = parseInt(hourStr, 10);
  if (!Number.isFinite(h) || h < 1 || h > 12) return null;
  const isPm = /p/i.test(ampm);
  if (h === 12) return isPm ? 12 : 0;
  return isPm ? h + 12 : h;
}

export function parseEfl(text: string, opts: { tier: "a" | "b" } = { tier: "a" }): ParsedEfl {
  const errors: string[] = [];
  const t = text.replace(/[ ]/g, " ").replace(/\s+/g, " ").trim();
  const isTierB = opts.tier === "b";

  // ENERGY CHARGE
  let energy_charge: EnergyCharge | null = null;
  const KWH = "(?:kWh|kilowatt[-\\s]?hour)";
  const energyLabel = isTierB ? "Energy (?:Charge|Rate|Price)" : "Energy Charge";

  const centsMatch = firstMatch(t, [
    new RegExp(`${energyLabel}[^0-9$%]{0,40}?(\\d+\\.\\d+|\\d+)\\s*(?:¢|cents)\\s*(?:\\/|per)?\\s*${KWH}`, "i"),
    new RegExp(`${energyLabel}[^0-9$%]{0,80}?(\\d+\\.\\d+)\\s*(?:¢|cents)`, "i"),
  ]);
  if (centsMatch) {
    energy_charge = { type: "flat", cents_per_kwh: toFloat(centsMatch[1]) };
  } else if (isTierB) {
    // Tier B also tries $0.0773 per kWh → × 100 for cents.
    const dollarMatch = firstMatch(t, [
      new RegExp(`${energyLabel}[^0-9$%]{0,40}?\\$\\s*(\\d+\\.\\d+|\\.\\d+)\\s*\\*?\\s*(?:\\/|per)?\\s*${KWH}`, "i"),
    ]);
    if (dollarMatch) {
      const dollarsPerKwh = toFloat(dollarMatch[1]);
      if (dollarsPerKwh != null) {
        energy_charge = { type: "flat", cents_per_kwh: round3(dollarsPerKwh * 100) };
      }
    }
  }
  if (!energy_charge) errors.push("energy_charge_not_found");

  // TOU DETECTION — runs after flat parsing so we have a default rate to fall
  // back on. Conservative: only emit `type: "tou"` when the EFL explicitly
  // names a free-window plan AND the window is parseable. Otherwise we keep
  // the flat charge and let the engine rank as before.
  if (energy_charge && energy_charge.type === "flat" && energy_charge.cents_per_kwh != null) {
    const windows: TouWindow[] = [];

    // Free Nights with explicit hour range.
    // Matches "Free Nights 9 p.m. to 6 a.m.", "free nights from 8pm-5am", etc.
    const nightsMatch = t.match(
      /Free\s*Nights?[^.]{0,120}?(\d{1,2})(?:[:.]\d{2})?\s*(a\.?m\.?|p\.?m\.?)\s*(?:to|until|–|—|-)\s*(\d{1,2})(?:[:.]\d{2})?\s*(a\.?m\.?|p\.?m\.?)/i,
    );
    if (nightsMatch) {
      const start = parseHour12(nightsMatch[1], nightsMatch[2]);
      const end = parseHour12(nightsMatch[3], nightsMatch[4]);
      if (start != null && end != null) {
        windows.push({
          label: "Free Nights",
          start_hour: start,
          end_hour: end,
          days: "all",
          cents_per_kwh: 0,
        });
      } else {
        errors.push("free_nights_hours_unparseable");
      }
    }

    // Free Weekends — usually all-day Sat+Sun, no explicit hours. We model it
    // as a window that covers every hour but is restricted to weekend days;
    // the cost function's day-mask logic prorates accordingly.
    if (/Free\s*Weekends?\b/i.test(t)) {
      windows.push({
        label: "Free Weekends",
        start_hour: 0,
        end_hour: 24,
        days: "weekends",
        cents_per_kwh: 0,
      });
    }

    if (windows.length > 0) {
      energy_charge = {
        type: "tou",
        default_cents_per_kwh: energy_charge.cents_per_kwh,
        windows,
      };
    }
  }

  // BASE CHARGE — many plans legitimately have none; null is fine, not an error.
  const baseMatch = firstMatch(t, [
    /Base (?:Monthly )?Charge[^0-9$]{0,15}\$\s*(\d+(?:\.\d+)?)/i,
    /Monthly (?:Base|Service|Customer) (?:Charge|Fee)[^0-9$]{0,15}\$\s*(\d+(?:\.\d+)?)/i,
    /Customer Charge[^0-9$]{0,15}\$\s*(\d+(?:\.\d+)?)/i,
  ]);
  const base_charge = baseMatch ? toFloat(baseMatch[1]) : null;

  // ETF
  const etfMatch = firstMatch(t, [
    /Early Termination Fee[:\s]*\$\s*(\d+(?:\.\d+)?)/i,
    /Cancellation Fee[:\s]*\$\s*(\d+(?:\.\d+)?)/i,
    /Termination Fee[:\s]*\$\s*(\d+(?:\.\d+)?)/i,
    /\$\s*(\d+(?:\.\d+)?)\s*fee[^.]*?terminat/i,
    /terminat[^$]{0,80}\$\s*(\d+(?:\.\d+)?)/i,
  ]);
  const etf_amount = etfMatch ? toFloat(etfMatch[1]) : null;

  // MIN USAGE FEE
  const minMatch = firstMatch(t, [
    /Minimum Usage (?:Fee|Charge)[:\s]*\$\s*(\d+(?:\.\d+)?)/i,
  ]);
  const minimum_usage_fee = minMatch ? toFloat(minMatch[1]) : null;

  // TDU CHARGES — per-kWh in cents (Tier A) or cents+dollars (Tier B).
  let tdu_per_kwh: number | null = null;
  const tduKwhCents = firstMatch(t, [
    /(?:Oncor|Centerpoint|AEP|TNMP|TDU|Delivery Charges?\*?)[^¢]{0,150}?(\d+\.\d+)\s*(?:¢|cents)\s*(?:\/|per)?\s*kWh/i,
  ]);
  if (tduKwhCents) {
    tdu_per_kwh = toFloat(tduKwhCents[1]);
  } else if (isTierB) {
    const tduKwhDollars = firstMatch(t, [
      /(?:Oncor|Centerpoint|AEP|TNMP|TDU|Delivery Charges?\*?)[^$]{0,150}?\$\s*(\d+\.\d+|\.\d+)\s*(?:\/|per)?\s*kWh/i,
    ]);
    if (tduKwhDollars) {
      const d = toFloat(tduKwhDollars[1]);
      if (d != null) tdu_per_kwh = round3(d * 100);
    }
  }
  const tduMonthMatch = firstMatch(t, [
    /(?:Oncor|Centerpoint|AEP|TNMP|TDU|Delivery Charges?\*?)[^$]{0,150}?\$\s*(\d+(?:\.\d+)?)\s*(?:per\s+(?:billing\s+cycle|bill\s+month|month)|\/\s*month)/i,
    /(?:Oncor|Centerpoint|AEP|TNMP|TDU|Delivery Charges?\*?)[^0-9$]{0,150}?(\d+(?:\.\d+)?)\s*\$\s*per\s+(?:bill\s+month|month|billing\s+cycle)/i,
  ]);
  const tdu_charges: TduCharges | null = (tdu_per_kwh != null || tduMonthMatch)
    ? {
        per_kwh_cents: tdu_per_kwh,
        per_month_usd: tduMonthMatch ? toFloat(tduMonthMatch[1]) : null,
      }
    : null;

  // BILL CREDIT
  const billCreditMatch = firstMatch(t, [
    /(?:Bill Credit|Usage Credit|Monthly Bill Credit|Residential Usage Credit)[^$\d]{0,30}\$\s*(\d+(?:\.\d+)?)[^.]{0,80}?(?:>=|>|at\s+)?(\d[,\d]*)\s*kWh/i,
    /\$\s*(\d+(?:\.\d+)?)\s*(?:bill|usage)\s*credit[^.]{0,60}?(?:>=|>|at\s+)?(\d[,\d]*)\s*kWh/i,
  ]);
  const bill_credits: BillCredits | null = billCreditMatch
    ? {
        amount: toFloat(billCreditMatch[1]),
        threshold_kwh: parseInt(billCreditMatch[2].replace(/,/g, ""), 10),
      }
    : null;

  return {
    base_charge,
    etf_amount,
    minimum_usage_fee,
    energy_charge,
    bill_credits,
    tdu_charges,
    raw_text: text.slice(0, 8000),
    parse_errors: errors,
  };
}
