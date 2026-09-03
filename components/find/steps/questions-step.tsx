"use client";

import { useState } from "react";
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
import { UsageEstimateModal } from "@/components/find/usage-estimate-modal";
import { parseSmtCsv, type ParsedMeterData } from "@/lib/smt-csv";

type Patch = Partial<Pick<WizardState, "monthlyUsageKwh" | "usageEstimate" | "rateTypePref" | "renewablePref" | "termPref" | "devices">>;

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
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [meterData, setMeterData] = useState<ParsedMeterData | null>(null);

  return (
    <div className="max-w-3xl mx-auto">
      <SectionLabel className="block mb-4">A few quick questions</SectionLabel>
      <h2 className="font-[family-name:var(--font-bebas)] text-foreground text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] tracking-tight mb-2">
        TELL US ABOUT <span className="text-accent">YOU.</span>
      </h2>
      <p className="font-mono text-sm text-muted-foreground mb-12">
        These shape the ranking. You can tune the weights on the next step.
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
            {[
              { kwh: 500, label: "Apartment" },
              { kwh: 1000, label: "Avg. Home" },
              { kwh: 2000, label: "Large Home" },
            ].map(({ kwh, label }) => (
              <button
                key={kwh}
                type="button"
                onClick={() => onChange({ monthlyUsageKwh: kwh })}
                className={`flex flex-col items-center gap-1 border px-3 py-2 font-mono uppercase tracking-widest transition-colors ${
                  state.monthlyUsageKwh === kwh
                    ? "border-accent text-accent"
                    : "border-foreground/25 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                }`}
              >
                <span className="text-xs">{label}</span>
                <span className="text-[10px] opacity-70">{kwh >= 1000 ? `${kwh / 1000}k` : kwh} kWh</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEstimateOpen(true)}
            className="mt-4 font-mono text-xs text-accent underline underline-offset-4 decoration-accent/40 hover:decoration-accent transition-colors"
          >
            Not sure? Estimate my usage →
          </button>
          {state.usageEstimate && !meterData && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              <span className="text-accent">●</span> Using WattBuy estimate
            </p>
          )}

          <MeterUpload
            data={meterData}
            onParsed={(result) => {
              setMeterData(result);
              onChange({ monthlyUsageKwh: Math.round(result.monthlyAvgKwh) });
            }}
            onClear={() => setMeterData(null)}
          />
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

        <Field label="03 / Rate type" help="Hard filter — only plans of this type will appear.">
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

      <WizardFooter onBack={onBack} onNext={onNext} nextLabel="Set weights →" />

      {estimateOpen && (
        <UsageEstimateModal
          zip={state.zip}
          onApply={(patch) => onChange(patch)}
          onClose={() => setEstimateOpen(false)}
        />
      )}
    </div>
  );
}

/** Optional Smart Meter Texas upload, offered alongside the manual usage entry.
 *  Parsing the export replaces the typed figure with the real monthly average,
 *  so the ranking runs against actual consumption instead of a round number.
 *  Collapsed to a single line until opened, so it stays out of the way of the
 *  people who just want to type 1000 and move on. */
function MeterUpload({
  data,
  onParsed,
  onClear,
}: {
  data: ParsedMeterData | null;
  onParsed: (d: ParsedMeterData) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setFilename(file.name);
    setParsing(true);
    try {
      const result = parseSmtCsv(await file.text());
      if (result.daysCovered === 0) {
        onClear();
        setError(
          "Couldn't read any usage rows from that file. Make sure it's the IntervalData.csv export from Smart Meter Texas.",
        );
        return;
      }
      onParsed(result);
    } catch {
      onClear();
      setError("Couldn't parse that file. Make sure it's a valid CSV.");
    } finally {
      setParsing(false);
    }
  }

  if (!open && !data) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 block font-mono text-xs text-accent underline underline-offset-4 decoration-accent/40 hover:decoration-accent transition-colors"
      >
        Have your Smart Meter Texas data? Upload it →
      </button>
    );
  }

  return (
    <div className="mt-4 max-w-xl border-l-2 border-accent/40 pl-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-2">
        Smart Meter Texas
      </div>
      <p className="font-mono text-[11px] leading-relaxed text-muted-foreground mb-3">
        Log in at{" "}
        <a
          href="https://smartmetertexas.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-accent/60 underline-offset-2 hover:text-accent transition-colors"
        >
          smartmetertexas.com
        </a>
        , go to <span className="text-foreground">Data → Usage → Export</span> and download{" "}
        <span className="text-foreground">IntervalData.csv</span> — up to 13 months of 15-minute
        readings. It is read in your browser and never uploaded.
      </p>

      <label
        htmlFor="smt-csv"
        className="block cursor-pointer border border-dashed border-border hover:border-accent transition-colors px-4 py-3"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-[11px] uppercase tracking-widest text-foreground truncate">
            {filename ?? "Choose CSV file"}
          </span>
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-accent">
            Browse →
          </span>
        </div>
        <input
          id="smt-csv"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </label>

      {parsing && <p className="mt-2 font-mono text-[11px] text-muted-foreground">Reading file…</p>}

      {error && (
        <p role="alert" className="mt-2 font-mono text-[11px] text-destructive">
          {error}
        </p>
      )}

      {data && (
        <dl className="mt-3 grid grid-cols-3 gap-3 font-mono text-[11px]">
          <div>
            <dt className="text-muted-foreground mb-0.5">Monthly avg</dt>
            <dd className="font-[family-name:var(--font-bebas)] text-base tracking-tight text-foreground">
              {Math.round(data.monthlyAvgKwh).toLocaleString()} kWh
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-0.5">Days</dt>
            <dd className="text-foreground">{data.daysCovered}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-0.5">Range</dt>
            <dd className="text-foreground text-[10px]">
              {data.earliest && data.latest ? `${data.earliest} → ${data.latest}` : "—"}
            </dd>
          </div>
        </dl>
      )}

      {data && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          <span className="text-accent">●</span> Usage set from your meter data
        </p>
      )}
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
