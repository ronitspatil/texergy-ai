"use client";

import { useState } from "react";
import type { WeightsUI } from "@/components/find/wizard-types";
import { SectionLabel } from "@/components/ui/section-label";
import { WizardFooter } from "@/components/find/wizard-footer";
import { Input } from "@/components/ui/input";

const FACTORS: { key: keyof WeightsUI; label: string; blurb: string }[] = [
  { key: "cost",                label: "Cost",              blurb: "Lower projected monthly bill at your usage." },
  { key: "renewable",           label: "Renewable",         blurb: "Higher renewable energy content." },
  { key: "contractFlexibility", label: "Flexibility",       blurb: "Low termination fees + short contract terms." },
  { key: "rateStability",       label: "Rate preference",   blurb: "How much your preferred rate type should pull matches toward it." },
  { key: "historicalPricing",   label: "Historical pricing", blurb: "Favors plans priced below the EIA Texas residential trailing-12-month average." },
  { key: "weatherForecast",     label: "Seasonality",       blurb: "Favors Fixed plans whose term covers TX summer/winter price-spike windows; penalizes Variable plans for the same exposure." },
  { key: "ratings",             label: "Ratings",           blurb: "Provider reputation (placeholder for now)." },
];

const PRESETS: { id: string; label: string; weights: WeightsUI }[] = [
  {
    id: "balanced",
    label: "Balanced",
    weights: { cost: 35, renewable: 10, contractFlexibility: 10, rateStability: 15, ratings: 10, historicalPricing: 10, weatherForecast: 10 },
  },
  {
    id: "cheapest",
    label: "Cheapest",
    weights: { cost: 60, renewable: 5, contractFlexibility: 5, rateStability: 5, ratings: 5, historicalPricing: 10, weatherForecast: 10 },
  },
  {
    id: "greenest",
    label: "Greenest",
    weights: { cost: 25, renewable: 45, contractFlexibility: 5, rateStability: 5, ratings: 5, historicalPricing: 10, weatherForecast: 5 },
  },
  {
    id: "flexible",
    label: "Most Flexible",
    weights: { cost: 30, renewable: 5, contractFlexibility: 40, rateStability: 5, ratings: 5, historicalPricing: 10, weatherForecast: 5 },
  },
  {
    id: "stable",
    label: "Most Stable",
    weights: { cost: 20, renewable: 5, contractFlexibility: 5, rateStability: 40, ratings: 5, historicalPricing: 10, weatherForecast: 15 },
  },
];

function clampWeight(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function weightsEqual(a: WeightsUI, b: WeightsUI): boolean {
  return (Object.keys(a) as (keyof WeightsUI)[]).every((k) => a[k] === b[k]);
}

export function WeightsStep({
  weights,
  onChange,
  onBack,
  onNext,
}: {
  weights: WeightsUI;
  onChange: (w: WeightsUI) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string>("none");
  const matchedPreset = PRESETS.find((p) => weightsEqual(p.weights, weights))?.id;
  // If the user changed sliders after picking a preset, drop back to none.
  const activePreset = selectedPreset !== "none" && matchedPreset === selectedPreset ? selectedPreset : "none";

  return (
    <div className="max-w-3xl mx-auto">
      <SectionLabel className="block mb-4">What matters to you</SectionLabel>
      <h2 className="font-[family-name:var(--font-bebas)] text-foreground text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] tracking-tight mb-2">
        DIAL IT <span className="text-accent">IN.</span>
      </h2>
      <p className="font-mono text-sm text-muted-foreground mb-6 max-w-2xl">
        Pick a preset or move each slider yourself. We normalize the values so total weight always sums to 1.
      </p>

      <div className="mb-8 flex items-center gap-3">
        <label htmlFor="weights-preset" className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Preset
        </label>
        <div className="relative">
          <select
            id="weights-preset"
            value={activePreset}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedPreset(id);
              const preset = PRESETS.find((p) => p.id === id);
              if (preset) onChange(preset.weights);
            }}
            className="h-9 cursor-pointer appearance-none rounded-md border border-foreground/25 bg-background/60 pl-3 pr-9 font-mono text-xs uppercase tracking-[0.15em] text-foreground hover:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="none">None</option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">▾</span>
        </div>
      </div>

      <div className="space-y-8">
        {FACTORS.map((f) => (
          <div key={f.key} className="border-t border-border/40 pt-6">
            <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
                  {f.label}
                </div>
                <p className="mt-2 max-w-xl font-mono text-xs text-muted-foreground">{f.blurb}</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <label htmlFor={`weight-${f.key}`} className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Weight
                </label>
                <Input
                  id={`weight-${f.key}`}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  value={weights[f.key]}
                  onChange={(e) =>
                    onChange({ ...weights, [f.key]: clampWeight(e.target.valueAsNumber) })
                  }
                  className="h-9 w-20 border-foreground/25 bg-background/60 px-2 text-center font-mono text-sm tabular-nums"
                  aria-label={`${f.label} weight`}
                />
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={weights[f.key]}
              onChange={(e) => onChange({ ...weights, [f.key]: parseInt(e.target.value, 10) })}
              className="w-full accent-accent"
            />
          </div>
        ))}
      </div>

      <WizardFooter onBack={onBack} onNext={onNext} nextLabel="See matches →" />
    </div>
  );
}
