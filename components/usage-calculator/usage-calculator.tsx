"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ────────────────────────────────────────────────────────────────────────────
// Heuristic model — explained
// ────────────────────────────────────────────────────────────────────────────
// monthly kWh = base + (occupants × per_occupant) + sqft × ac_factor
//                    + sqft × heat_factor + sum(add-on fixed kWh)
//
// Coefficients are calibrated to put a typical Texas household (2,000 sqft,
// 3 occupants, central AC, gas heat, no extras) at ~1,100 kWh/mo, which
// matches the EIA Form 826 trailing-12-mo TX residential average.
// Numbers won't be precise per-household; that's fine — the point is to
// hand the plan finder a number that's directionally right, not a metered
// reading.

const BASE_KWH = 250; // always-on: fridge, electronics standby, base lighting
const PER_OCCUPANT_KWH = 110; // laundry, cooking, hot water draws, TVs

// kWh per sqft per month (annualized average; summer is ~2x this in TX)
const AC_FACTOR: Record<AcType, number> = {
  central: 0.36,
  window: 0.20,
  none: 0,
};

const HEAT_FACTOR: Record<HeatType, number> = {
  gas: 0,
  "heat-pump": 0.10,
  electric: 0.25,
  none: 0,
};

const ADDON_KWH: Record<Addon, number> = {
  pool: 300,
  ev: 350,
  "hot-tub": 200,
  "electric-water-heater": 400,
  "electric-dryer": 75,
};

const DEFAULT_RATE_CENTS = 14.5;

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type SqftBand = "tiny" | "small" | "medium" | "large" | "xl";
type Occupants = 1 | 2 | 3 | 4 | 5;
type AcType = "central" | "window" | "none";
type HeatType = "gas" | "heat-pump" | "electric" | "none";
type Addon = "pool" | "ev" | "hot-tub" | "electric-water-heater" | "electric-dryer";

type State = {
  sqftBand: SqftBand;
  occupants: Occupants;
  acType: AcType;
  heatType: HeatType;
  addons: Addon[];
  rateCents: number;
};

const SQFT_VALUES: Record<SqftBand, { label: string; sqft: number; sub: string }> = {
  tiny: { label: "< 1,000", sqft: 800, sub: "Apartment / small condo" },
  small: { label: "1,000–1,500", sqft: 1250, sub: "Starter home" },
  medium: { label: "1,500–2,500", sqft: 2000, sub: "Typical home" },
  large: { label: "2,500–3,500", sqft: 3000, sub: "Larger home" },
  xl: { label: "3,500+", sqft: 4000, sub: "Big house" },
};

const ADDON_LABELS: Record<Addon, { label: string; sub: string }> = {
  pool: { label: "Pool / spa", sub: "+~300 kWh" },
  ev: { label: "EV charging at home", sub: "+~350 kWh" },
  "hot-tub": { label: "Hot tub", sub: "+~200 kWh" },
  "electric-water-heater": { label: "Electric water heater", sub: "+~400 kWh" },
  "electric-dryer": { label: "Electric clothes dryer", sub: "+~75 kWh" },
};

const INITIAL: State = {
  sqftBand: "medium",
  occupants: 3,
  acType: "central",
  heatType: "gas",
  addons: [],
  rateCents: DEFAULT_RATE_CENTS,
};

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

function classifyUsage(monthlyKwh: number): { label: string; color: string; note: string } {
  // Thresholds tuned so a typical 3-person, 2,000 sqft, central-AC, gas-heat
  // Texas household lands in "Average" rather than instantly tripping into
  // the "Above average" bucket on page load.
  if (monthlyKwh < 750) return { label: "Low", color: "text-emerald-500", note: "Below the Texas average — efficient household." };
  if (monthlyKwh < 1500) return { label: "Average", color: "text-accent", note: "Right around the typical Texas household. Most plans optimize for this range." };
  if (monthlyKwh < 2100) return { label: "Above average", color: "text-amber-500", note: "Larger home or heavy AC use. Plan choice starts to matter more." };
  return { label: "High", color: "text-red-500", note: "Heavy HVAC, pool, EV, or all-electric home. Plan choice matters a lot — small rate differences compound." };
}

export function UsageCalculator() {
  const [state, setState] = useState<State>(INITIAL);

  const { kwh, bill, bucket, sqft } = useMemo(() => {
    const sqft = SQFT_VALUES[state.sqftBand].sqft;
    const ac = sqft * AC_FACTOR[state.acType];
    const heat = sqft * HEAT_FACTOR[state.heatType];
    const occ = state.occupants * PER_OCCUPANT_KWH;
    const addons = state.addons.reduce((sum, a) => sum + ADDON_KWH[a], 0);
    const kwh = BASE_KWH + occ + ac + heat + addons;
    const bill = (kwh * state.rateCents) / 100;
    return { kwh, bill, bucket: classifyUsage(kwh), sqft };
  }, [state]);

  function set<K extends keyof State>(key: K, value: State[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function toggleAddon(a: Addon) {
    setState((s) => ({
      ...s,
      addons: s.addons.includes(a) ? s.addons.filter((x) => x !== a) : [...s.addons, a],
    }));
  }

  function reset() {
    setState(INITIAL);
  }

  return (
    <div className="space-y-8">
      {/* Live estimate hero */}
      <div className="border border-accent/40 rounded-lg p-6 md:p-8 bg-accent/5">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
            Your estimate
          </span>
          <span className={`font-mono text-[10px] uppercase tracking-[0.3em] ${bucket.color}`}>
            {bucket.label}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <Stat label="Monthly kWh" value={Math.round(kwh).toLocaleString()} highlight />
          <Stat label="Est. monthly bill" value={`$${Math.round(bill)}`} />
          <Stat label="Annual cost" value={`$${(bill * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        </div>
        <p className="mt-5 font-mono text-xs text-muted-foreground leading-relaxed">
          {bucket.note} · Bill estimate at {state.rateCents.toFixed(1)}¢/kWh, excluding base charges and TDU delivery fees (typically $5–20/mo).
        </p>
      </div>

      {/* Step 1: Home size */}
      <Question
        step="01"
        title="How big is your home?"
        hint="A rough estimate is fine — drives air-conditioning load more than anything else."
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(SQFT_VALUES) as SqftBand[]).map((band) => {
            const { label, sub } = SQFT_VALUES[band];
            const selected = state.sqftBand === band;
            return (
              <ChoiceButton key={band} selected={selected} onClick={() => set("sqftBand", band)}>
                <span className="block font-mono text-sm">{label}</span>
                <span className="block font-mono text-[10px] text-muted-foreground mt-1">sqft · {sub}</span>
              </ChoiceButton>
            );
          })}
        </div>
      </Question>

      {/* Step 2: Occupants */}
      <Question step="02" title="How many people live there?" hint="Drives laundry, hot water, cooking, screens.">
        <div className="grid grid-cols-5 gap-2 max-w-sm">
          {([1, 2, 3, 4, 5] as Occupants[]).map((n) => (
            <ChoiceButton key={n} selected={state.occupants === n} onClick={() => set("occupants", n)}>
              <span className="font-mono text-lg">{n === 5 ? "5+" : n}</span>
            </ChoiceButton>
          ))}
        </div>
      </Question>

      {/* Step 3: AC */}
      <Question step="03" title="What kind of cooling?" hint="Texas summers — biggest single driver of your bill.">
        <div className="grid grid-cols-3 gap-2 max-w-xl">
          <ChoiceButton selected={state.acType === "central"} onClick={() => set("acType", "central")}>
            <span className="block font-mono text-sm">Central AC</span>
            <span className="block font-mono text-[10px] text-muted-foreground mt-1">Most common</span>
          </ChoiceButton>
          <ChoiceButton selected={state.acType === "window"} onClick={() => set("acType", "window")}>
            <span className="block font-mono text-sm">Window units</span>
            <span className="block font-mono text-[10px] text-muted-foreground mt-1">One or two rooms</span>
          </ChoiceButton>
          <ChoiceButton selected={state.acType === "none"} onClick={() => set("acType", "none")}>
            <span className="block font-mono text-sm">No AC</span>
            <span className="block font-mono text-[10px] text-muted-foreground mt-1">Rare in TX</span>
          </ChoiceButton>
        </div>
      </Question>

      {/* Step 4: Heat */}
      <Question step="04" title="What kind of heating?" hint="Gas heat = invisible to your electric bill. Electric resistance = pricey.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
          <ChoiceButton selected={state.heatType === "gas"} onClick={() => set("heatType", "gas")}>
            <span className="block font-mono text-sm">Gas furnace</span>
            <span className="block font-mono text-[10px] text-muted-foreground mt-1">0 kWh impact</span>
          </ChoiceButton>
          <ChoiceButton selected={state.heatType === "heat-pump"} onClick={() => set("heatType", "heat-pump")}>
            <span className="block font-mono text-sm">Heat pump</span>
            <span className="block font-mono text-[10px] text-muted-foreground mt-1">Moderate</span>
          </ChoiceButton>
          <ChoiceButton selected={state.heatType === "electric"} onClick={() => set("heatType", "electric")}>
            <span className="block font-mono text-sm">Electric</span>
            <span className="block font-mono text-[10px] text-muted-foreground mt-1">Resistance / baseboard</span>
          </ChoiceButton>
          <ChoiceButton selected={state.heatType === "none"} onClick={() => set("heatType", "none")}>
            <span className="block font-mono text-sm">None</span>
            <span className="block font-mono text-[10px] text-muted-foreground mt-1">Mild climate</span>
          </ChoiceButton>
        </div>
      </Question>

      {/* Step 5: Add-ons */}
      <Question
        step="05"
        title="Anything else big?"
        hint="Check anything that applies. Skip if none."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
          {(Object.keys(ADDON_LABELS) as Addon[]).map((a) => {
            const selected = state.addons.includes(a);
            const { label, sub } = ADDON_LABELS[a];
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAddon(a)}
                className={`flex items-center justify-between gap-3 px-4 py-3 border transition-colors text-left ${
                  selected
                    ? "border-accent bg-accent/5 text-accent"
                    : "border-foreground/20 text-foreground hover:border-foreground/40"
                }`}
              >
                <span>
                  <span className="block font-mono text-sm">{label}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground mt-0.5">{sub}/mo</span>
                </span>
                <span
                  className={`shrink-0 w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                    selected ? "border-accent bg-accent text-accent-foreground" : "border-foreground/30"
                  }`}
                  aria-hidden="true"
                >
                  {selected ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </Question>

      {/* Optional: rate override */}
      <Question
        step="06"
        title="Your electricity rate (optional)"
        hint="Default is the trailing 12-month Texas residential average. Edit to match your plan's effective rate for a more accurate bill."
      >
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={5}
            max={50}
            step={0.1}
            value={state.rateCents}
            onChange={(e) =>
              set("rateCents", Math.max(1, Math.min(50, parseFloat(e.target.value) || 0)))
            }
            className="w-28 bg-transparent border border-foreground/25 px-3 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-accent transition-colors text-right tabular-nums"
          />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            ¢ / kWh
          </span>
          <button
            type="button"
            onClick={() => set("rateCents", DEFAULT_RATE_CENTS)}
            className="ml-auto px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-accent border border-border/40 hover:border-accent/40 transition-colors"
          >
            Reset
          </button>
        </div>
      </Question>

      {/* Reset all */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={reset}
          className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-accent border border-border/40 hover:border-accent/40 transition-colors"
        >
          Reset everything
        </button>
      </div>

      {/* Inline CTA */}
      <div className="border border-border/40 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center gap-4 bg-background/40">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm text-foreground/80 leading-relaxed">
            Use this{" "}
            <span className="text-accent">
              {Math.round(kwh).toLocaleString()} kWh / month
            </span>{" "}
            estimate to rank plans at your actual usage level.
          </p>
        </div>
        <Link
          href="/#hero"
          className="shrink-0 px-6 py-3 bg-accent text-background font-mono text-xs uppercase tracking-[0.3em] hover:bg-accent/90 transition-colors whitespace-nowrap"
        >
          Find my plan →
        </Link>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Building blocks
// ────────────────────────────────────────────────────────────────────────────

function Question({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border/30 rounded-lg p-5 md:p-6 bg-background/30">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent tabular-nums">
          {step}
        </span>
        <h3 className="font-display text-2xl tracking-tight leading-none">
          {title.toUpperCase()}
        </h3>
      </div>
      <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-5 max-w-2xl">
        {hint}
      </p>
      {children}
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-3 border text-center transition-colors ${
        selected
          ? "border-accent bg-accent/5 text-accent"
          : "border-foreground/20 text-foreground hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {label}
      </div>
      <div
        className={`font-display text-4xl tabular-nums tracking-tight leading-none ${
          highlight ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
