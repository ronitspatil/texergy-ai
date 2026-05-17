"use client";

import type {
  BaseChargePref,
  EtfPref,
  RateTypePref,
  RenewablePref,
  TermPref,
  TimeOfUsePref,
  WeightsUI,
  WizardState,
} from "@/components/find/wizard-types";

/** Editable preference panel that lives next to the results. Every change
 *  triggers a re-fetch upstream (because results-step.tsx watches inputKey).
 *  Smart-mode users see weight sliders; basic-mode users only see filters. */
export function ResultsSidebar({
  state,
  onUpdate,
}: {
  state: WizardState;
  onUpdate: (patch: Partial<WizardState>) => void;
}) {
  const isSmart = state.mode === "smart";

  return (
    <div className="space-y-8">
      <Block label="Usage">
        <input
          type="number"
          min={50}
          max={20000}
          step={50}
          value={state.monthlyUsageKwh}
          onChange={(e) =>
            onUpdate({
              monthlyUsageKwh: Math.max(50, Math.min(20000, parseInt(e.target.value || "0", 10) || 0)),
            })
          }
          className="w-full bg-transparent border border-foreground/25 px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
        />
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          kWh / mo
        </div>
      </Block>

      <Block label="Rate type">
        <Chips
          value={state.rateTypePref}
          options={[
            { value: "any", label: "Any" },
            { value: "Fixed", label: "Fixed" },
            { value: "Variable", label: "Var" },
            { value: "Indexed", label: "Idx" },
          ]}
          onChange={(v) => onUpdate({ rateTypePref: v as RateTypePref })}
        />
      </Block>

      <Block label="Renewable">
        <Chips
          value={state.renewablePref}
          options={[
            { value: "any", label: "Any" },
            { value: "atleast50", label: "50%+" },
            { value: "atleast90", label: "90%+" },
            { value: "only100", label: "100" },
          ]}
          onChange={(v) => onUpdate({ renewablePref: v as RenewablePref })}
        />
      </Block>

      <Block label="Term">
        <Chips
          value={state.termPref}
          options={[
            { value: "any", label: "Any" },
            { value: "monthToMonth", label: "M2M" },
            { value: "short", label: "≤6" },
            { value: "medium", label: "12" },
            { value: "long", label: "24+" },
          ]}
          onChange={(v) => onUpdate({ termPref: v as TermPref })}
        />
      </Block>

      <Block label="Time of use">
        <Chips
          value={state.timeOfUsePref}
          options={[
            { value: "any", label: "Any" },
            { value: "only", label: "ToU only" },
          ]}
          onChange={(v) => onUpdate({ timeOfUsePref: v as TimeOfUsePref })}
        />
      </Block>

      <Block label="Base charge">
        <Chips
          value={state.baseChargePref}
          options={[
            { value: "any", label: "Any" },
            { value: "zero", label: "$0" },
            { value: "atmost5", label: "≤$5" },
            { value: "atmost10", label: "≤$10" },
          ]}
          onChange={(v) => onUpdate({ baseChargePref: v as BaseChargePref })}
        />
      </Block>

      <Block label="ETF">
        <Chips
          value={state.etfPref}
          options={[
            { value: "any", label: "Any" },
            { value: "none", label: "None" },
            { value: "atmost100", label: "≤$100" },
            { value: "atmost200", label: "≤$200" },
          ]}
          onChange={(v) => onUpdate({ etfPref: v as EtfPref })}
        />
      </Block>

      {isSmart && (
        <Block label="Weights">
          <WeightSliders
            weights={state.weights}
            onChange={(weights) => onUpdate({ weights })}
          />
        </Block>
      )}
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-3">{label}</div>
      {children}
    </div>
  );
}

function Chips({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
            value === o.value
              ? "border-accent text-accent"
              : "border-foreground/20 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const SLIDER_FACTORS: { key: keyof WeightsUI; label: string }[] = [
  { key: "cost", label: "Cost" },
  { key: "renewable", label: "Renew" },
  { key: "contractFlexibility", label: "Flex" },
  { key: "rateStability", label: "Stable" },
  { key: "ratings", label: "Rating" },
];

function WeightSliders({
  weights,
  onChange,
}: {
  weights: WeightsUI;
  onChange: (w: WeightsUI) => void;
}) {
  return (
    <div className="space-y-3">
      {SLIDER_FACTORS.map((f) => (
        <div key={f.key}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/80">{f.label}</span>
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{weights[f.key]}</span>
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
  );
}
