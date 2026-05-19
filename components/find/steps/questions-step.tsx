"use client";

import type {
  DeviceFlag,
  RateTypePref,
  RenewablePref,
  TermPref,
  WizardState,
} from "@/components/find/wizard-types";
import { DEVICE_OPTIONS } from "@/components/find/wizard-types";
import { SectionLabel } from "@/components/ui/section-label";
import { WizardFooter } from "@/components/find/wizard-footer";

type Patch = Partial<Pick<WizardState, "monthlyUsageKwh" | "rateTypePref" | "renewablePref" | "termPref" | "devices">>;

export function QuestionsStep({
  state,
  onChange,
  onBack,
  onNext,
}: {
  state: WizardState;
  onChange: (patch: Patch) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const isSmart = state.mode === "smart";

  return (
    <div className="max-w-3xl mx-auto">
      <SectionLabel className="block mb-4">A few quick questions</SectionLabel>
      <h2 className="font-[family-name:var(--font-bebas)] text-foreground text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] tracking-tight mb-2">
        TELL US ABOUT <span className="text-accent">YOU.</span>
      </h2>
      <p className="font-mono text-sm text-muted-foreground mb-12">
        {isSmart
          ? "These shape the ranking. You can tune the weights on the next step."
          : "These become hard filters on the plan list."}
      </p>

      <div className="space-y-12">
        <Field
          label="01 / Monthly usage"
          help="Most TX homes land around 1,000 kWh/month. Larger homes / pool / EV push it higher."
        >
          <div className="flex items-center gap-4 max-w-md">
            <input
              type="number"
              min={50}
              max={20000}
              step={50}
              value={state.monthlyUsageKwh}
              onChange={(e) => onChange({ monthlyUsageKwh: Math.max(50, Math.min(20000, parseInt(e.target.value || "0", 10) || 0)) })}
              className="flex-1 bg-transparent border border-foreground/25 px-4 py-3 font-mono text-lg text-foreground focus:outline-none focus:border-accent transition-colors"
            />
            <span className="font-mono text-sm text-muted-foreground">kWh / mo</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 max-w-md">
            {[500, 1000, 2000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ monthlyUsageKwh: preset })}
                className={`border px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                  state.monthlyUsageKwh === preset
                    ? "border-accent text-accent"
                    : "border-foreground/25 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                }`}
              >
                {preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="02 / What's in your home? (optional)"
          help="Used to lightly bias the ranking. EV or battery owners benefit from time-of-use plans; solar tilts away from minimum-usage fees."
        >
          <DeviceChecklist
            value={state.devices}
            onChange={(devices) => onChange({ devices })}
          />
        </Field>

        <Field label="03 / Rate type" help={isSmart ? "We'll bias toward your pick but won't hide alternatives." : "Hard filter — only plans of this type will appear."}>
          <RadioRow
            value={state.rateTypePref}
            onChange={(v) => onChange({ rateTypePref: v as RateTypePref })}
            options={[
              { value: "any", label: "Any" },
              { value: "Fixed", label: "Fixed" },
              { value: "Variable", label: "Variable" },
            ]}
          />
        </Field>

        <Field label="04 / Renewable energy" help="The % renewable content in your plan. State average is ~35%.">
          <RadioRow
            value={state.renewablePref}
            onChange={(v) => onChange({ renewablePref: v as RenewablePref })}
            options={[
              { value: "any", label: "Don't care" },
              { value: "atleast25", label: "≥ 25%" },
              { value: "atleast50", label: "≥ 50%" },
              { value: "atleast90", label: "≥ 90%" },
              { value: "only100", label: "100% only" },
            ]}
          />
        </Field>

        <Field label="05 / Contract length" help="Longer terms usually lock a better rate but mean higher ETF if you move.">
          <RadioRow
            value={state.termPref}
            onChange={(v) => onChange({ termPref: v as TermPref })}
            options={[
              { value: "any", label: "Any" },
              { value: "monthToMonth", label: "Month-to-month" },
              { value: "short", label: "≤ 6 mo" },
              { value: "medium", label: "12 mo" },
              { value: "long", label: "24+ mo" },
            ]}
          />
        </Field>
      </div>

      <WizardFooter onBack={onBack} onNext={onNext} nextLabel={isSmart ? "Set weights →" : "See matches →"} />
    </div>
  );
}

/** Multi-select checklist of household devices. Selecting any device removes
 *  the "none" affordance; clicking "I don't have any" clears all selections.
 *  Empty array = "none". */
function DeviceChecklist({
  value,
  onChange,
}: {
  value: DeviceFlag[];
  onChange: (v: DeviceFlag[]) => void;
}) {
  const has = (d: DeviceFlag) => value.includes(d);
  const noneSelected = value.length === 0;

  function toggle(d: DeviceFlag) {
    onChange(has(d) ? value.filter((x) => x !== d) : [...value, d]);
  }

  return (
    <div className="flex flex-col gap-2 max-w-xl">
      {DEVICE_OPTIONS.map((o) => {
        const checked = has(o.value);
        return (
          <label
            key={o.value}
            className={`flex items-center gap-3 border px-4 py-3 cursor-pointer transition-colors ${
              checked
                ? "border-accent text-accent"
                : "border-foreground/20 text-foreground hover:border-foreground/40"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(o.value)}
              className="accent-accent"
            />
            <span className="font-mono text-sm">{o.label}</span>
          </label>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([])}
        className={`mt-1 border px-4 py-3 text-left font-mono text-sm transition-colors ${
          noneSelected
            ? "border-accent text-accent"
            : "border-foreground/15 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        }`}
      >
        I don&apos;t have any of these devices
      </button>
    </div>
  );
}

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border/40 pt-8">
      <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent mb-2">{label}</div>
      <p className="font-mono text-xs text-muted-foreground mb-5 max-w-xl">{help}</p>
      {children}
    </div>
  );
}

function RadioRow({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`border px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
            value === o.value
              ? "border-accent text-accent"
              : "border-foreground/25 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
