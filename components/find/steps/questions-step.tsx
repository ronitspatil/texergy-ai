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
      <h2 className="font-[family-name:var(--font-bebas)] text-foreground text-[clamp(2.5rem,calc(var(--vpw)*5),4rem)] leading-[0.95] tracking-tight mb-2">
        TELL US ABOUT <span className="text-accent">YOU.</span>
      </h2>
      <p className="font-mono text-sm leading-relaxed text-muted-foreground mb-12 max-w-2xl">
        Only the first question needs an answer. The rest narrow the list, and you can change
        any of it later without starting over.
      </p>

      <div className="space-y-12">
        <Field
          label="01 / How much power do you use?"
          help="Check a recent bill for your kWh, or pick the closest home below. Most Texas homes land near 1,000 kWh a month; a pool, an EV, or a big house pushes that up."
        >
          <div className="flex items-center gap-4 max-w-md">
            <input
              type="number"
              min={50}
              max={20000}
              step={50}
              value={state.monthlyUsageKwh}
              onChange={(e) => onChange({ monthlyUsageKwh: Math.max(50, Math.min(20000, parseInt(e.target.value || "0", 10) || 0)) })}
              className="flex-1 bg-transparent border border-foreground/25 px-4 py-3 font-mono text-sm sm:text-lg text-foreground focus:outline-none focus:border-accent transition-colors"
            />
            <span className="font-mono text-sm text-muted-foreground">kWh / mo</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 max-w-md">
            {[
              { kwh: 500, label: "Apartment" },
              { kwh: 1000, label: "Average home" },
              { kwh: 2000, label: "Large home" },
            ].map(({ kwh, label }) => (
              <button
                key={kwh}
                type="button"
                onClick={() => onChange({ monthlyUsageKwh: kwh })}
                className={`flex flex-col items-center gap-1 border px-3 py-2.5 font-mono transition-colors ${
                  state.monthlyUsageKwh === kwh
                    ? "border-accent text-accent"
                    : "border-foreground/25 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                }`}
              >
                <span className="text-sm leading-none">{label}</span>
                <span className="text-[11px] opacity-70">{kwh >= 1000 ? `${kwh / 1000}k` : kwh} kWh</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEstimateOpen(true)}
            className="mt-4 font-mono text-xs text-accent underline underline-offset-4 decoration-accent/40 hover:decoration-accent transition-colors"
          >
            Not sure? Estimate it from my home →
          </button>
          {state.usageEstimate && !meterData && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              <span className="text-accent">●</span> Using the estimate for your home
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
          label="02 / Do you have any of these? (optional)"
          help="These change which plans suit you. An EV or a home battery makes cheap-overnight plans worth a look, and solar makes it worth dodging fees that hit you for using too little."
        >
          <DeviceChecklist
            value={state.devices}
            onChange={(devices) => onChange({ devices })}
          />
        </Field>

        <Field
          label="03 / Fixed or variable rate?"
          help="Fixed stays the same all term. Variable can drop, but it can also spike. Pick one and we only show that kind."
        >
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

        <Field
          label="04 / How much renewable energy?"
          help="The share of your power from wind and solar. Around 35% is typical in Texas, and going higher often costs little or nothing extra."
        >
          <RadioRow
            value={state.renewablePref}
            onChange={(v) => onChange({ renewablePref: v as RenewablePref })}
            options={[
              { value: "any", label: "Any" },
              { value: "atleast25", label: "25% or more" },
              { value: "atleast50", label: "Half or more" },
              { value: "atleast90", label: "Nearly all" },
              { value: "only100", label: "100% only" },
            ]}
          />
        </Field>

        <Field
          label="05 / How long a contract?"
          help="Longer terms usually lock in a better rate, but leaving early costs more. Month-to-month is free to quit and priced accordingly."
        >
          <RadioRow
            value={state.termPref}
            onChange={(v) => onChange({ termPref: v as TermPref })}
            options={[
              { value: "any", label: "Any" },
              { value: "monthToMonth", label: "Month to month" },
              { value: "short", label: "6 months or less" },
              { value: "medium", label: "About a year" },
              { value: "long", label: "2 years or more" },
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
        Want exact numbers? Upload your meter data →
      </button>
    );
  }

  return (
    <div className="mt-4 max-w-xl border-l-2 border-accent/40 pl-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-2">
        Smart Meter Texas
      </div>
      <p className="font-mono text-xs leading-relaxed text-muted-foreground mb-3">
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
        <span className="text-foreground">IntervalData.csv</span>, which covers up to 13 months of
        15-minute readings. The file is read in your browser and never leaves your computer.
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
        None of these
      </button>
    </div>
  );
}

/** One question. The number keeps the editorial micro-label treatment; the
 *  question itself is set as a plain sentence, because uppercase mono at wide
 *  tracking is fine for a two-word label and miserable to read as prose. */
function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  const [number, ...rest] = label.split(" / ");
  const question = rest.join(" / ");
  return (
    <div className="border-t border-border/40 pt-8">
      <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">{number}</div>
      <h3 className="mt-2 font-mono text-base sm:text-lg leading-snug text-foreground">{question}</h3>
      <p className="mt-2 mb-5 max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">{help}</p>
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
          className={`border px-4 py-2.5 font-mono text-sm transition-colors ${
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
