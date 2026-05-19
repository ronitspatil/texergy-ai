"use client";

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
  { key: "weatherForecast",     label: "Weather forecast",  blurb: "Reserved for upcoming forecast-driven biasing. Neutral for now." },
  { key: "ratings",             label: "Ratings",           blurb: "Provider reputation (placeholder for now)." },
];

function clampWeight(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
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
  return (
    <div className="max-w-3xl mx-auto">
      <SectionLabel className="block mb-4">What matters to you</SectionLabel>
      <h2 className="font-[family-name:var(--font-bebas)] text-foreground text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] tracking-tight mb-2">
        DIAL IT <span className="text-accent">IN.</span>
      </h2>
      <p className="font-mono text-sm text-muted-foreground mb-12 max-w-2xl">
        Move each slider to weight how much that factor should influence the ranking. We normalize the values so total weight always sums to 1.
      </p>

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
