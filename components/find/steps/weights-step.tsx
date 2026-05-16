"use client";

import type { WeightsUI } from "@/components/find/wizard-types";
import { SectionLabel } from "@/components/ui/section-label";
import { WizardFooter } from "@/components/find/wizard-footer";

const FACTORS: { key: keyof WeightsUI; label: string; blurb: string }[] = [
  { key: "cost",                label: "Cost",          blurb: "Lower projected monthly bill at your usage." },
  { key: "renewable",           label: "Renewable",     blurb: "Higher renewable energy content." },
  { key: "contractFlexibility", label: "Flexibility",   blurb: "Low termination fees + short contract terms." },
  { key: "rateStability",       label: "Stability",     blurb: "Predictable rate (Fixed > Indexed > Variable)." },
  { key: "ratings",             label: "Ratings",       blurb: "Provider reputation (placeholder for now)." },
];

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
            <div className="flex items-baseline justify-between mb-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
                {f.label}
              </div>
              <div className="font-mono text-xs text-foreground tabular-nums">
                {weights[f.key]}
              </div>
            </div>
            <p className="font-mono text-xs text-muted-foreground mb-4 max-w-xl">{f.blurb}</p>
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
