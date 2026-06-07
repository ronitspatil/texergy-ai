"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { UsageForecastChart } from "@/components/find/usage-forecast-chart";
import type { UsageEstimate } from "@/components/find/wizard-types";

const HOUSE_TYPES = [
  { value: "", label: "Either" },
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
] as const;

const HEATING_SOURCES = [
  "",
  "Electricity",
  "Natural Gas",
  "Fuel Oil",
  "Propane",
  "Other Fuel",
  "None",
] as const;

type FormState = {
  address: string;
  city: string;
  state: string;
  sq_ft: string;
  bedrooms: string;
  bathrooms: string;
  year_built: string;
  stories: string;
  house_type: string;
  heating_fuel_source: string;
};

const INITIAL_FORM: FormState = {
  address: "",
  city: "",
  state: "TX",
  sq_ft: "",
  bedrooms: "",
  bathrooms: "",
  year_built: "",
  stories: "",
  house_type: "",
  heating_fuel_source: "",
};

const REASON_COPY: Record<string, string> = {
  not_configured: "Usage estimates aren't available right now. Enter your usage manually instead.",
  no_estimate: "Couldn't estimate usage for those details. Try adding an address, or enter usage manually.",
  invalid_input: "Some details look off. Double-check the address and numbers.",
  auth: "Usage estimates are temporarily unavailable. Enter your usage manually instead.",
  unreachable: "The estimator is temporarily unreachable. Try again in a moment.",
  upstream_error: "The estimator hit an error. Try again in a moment.",
  rate_limited: "Too many estimates in a short window. Try again later.",
};

/** In-wizard estimator. Collects address/housing details, calls the WattBuy
 *  proxy, and shows a 12-month forecast the user can apply back to the wizard's
 *  monthly-usage field. Mirrors the portal + scroll-lock + Escape pattern used
 *  by EditWeightsDialog so it layers over the framer-motion-transformed step. */
export function UsageEstimateModal({
  zip,
  onApply,
  onClose,
}: {
  zip: string;
  onApply: (patch: { monthlyUsageKwh: number; usageEstimate: UsageEstimate }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UsageEstimate | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const scrollY = window.scrollY;
    const prev = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev.htmlOverflow;
      document.body.style.position = prev.bodyPosition;
      document.body.style.top = prev.bodyTop;
      document.body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [onClose]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = { zip };
      for (const [k, v] of Object.entries(form)) {
        if (typeof v === "string" && v.trim()) body[k] = v.trim();
      }
      const res = await fetch("/api/usage-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const data = (await res.json().catch(() => ({}))) as
        | ({ ok: true } & UsageEstimate)
        | { ok: false; reason?: string };
      if (!data.ok) {
        setError(REASON_COPY[data.reason ?? ""] ?? "Couldn't estimate usage. Enter it manually instead.");
        setResult(null);
        return;
      }
      const { ok: _ok, ...estimate } = data;
      void _ok;
      setResult(estimate);
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "TimeoutError"
          ? "This is taking longer than expected. Try again in a moment."
          : "Network error. Try again.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function apply() {
    if (!result) return;
    onApply({ monthlyUsageKwh: result.monthlyAvgKwh, usageEstimate: result });
    onClose();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="usage-estimate-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto"
        data-lenis-prevent="true"
        role="dialog"
        aria-modal="true"
        aria-label="Estimate my usage"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-screen flex items-start sm:items-center justify-center px-4 py-12"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-xl border border-border bg-background p-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                  Estimate my usage
                </div>
                <h2 className="mt-2 font-display text-3xl tracking-tight leading-none">
                  HOW MUCH WILL YOU USE?
                </h2>
                <p className="mt-3 font-mono text-xs text-muted-foreground leading-relaxed">
                  Add an address or a few home details and we&apos;ll forecast your
                  monthly usage. Everything but the address is optional.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 border border-foreground/25 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
                <TextField
                  label="Street address"
                  value={form.address}
                  onChange={(v) => set("address", v)}
                  placeholder="Street address"
                  autoComplete="street-address"
                />
                <TextField
                  label="City"
                  value={form.city}
                  onChange={(v) => set("city", v)}
                  placeholder="City"
                  autoComplete="address-level2"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ReadOnlyField label="ZIP" value={zip} />
                <TextField
                  label="State"
                  value={form.state}
                  onChange={(v) => set("state", v.toUpperCase().slice(0, 2))}
                  placeholder="State"
                />
                <NumberField label="Sq ft" value={form.sq_ft} onChange={(v) => set("sq_ft", v)} placeholder="Sq ft" />
                <NumberField label="Year built" value={form.year_built} onChange={(v) => set("year_built", v)} placeholder="Year" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <NumberField label="Beds" value={form.bedrooms} onChange={(v) => set("bedrooms", v)} placeholder="Beds" />
                <NumberField label="Baths" value={form.bathrooms} onChange={(v) => set("bathrooms", v)} placeholder="Baths" />
                <NumberField label="Stories" value={form.stories} onChange={(v) => set("stories", v)} placeholder="Stories" />
                <SelectField
                  label="Type"
                  value={form.house_type}
                  onChange={(v) => set("house_type", v)}
                  options={HOUSE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                />
              </div>
              <SelectField
                label="Heating fuel"
                value={form.heating_fuel_source}
                onChange={(v) => set("heating_fuel_source", v)}
                options={HEATING_SOURCES.map((s) => ({ value: s, label: s || "Don't know" }))}
              />

              {error && (
                <p className="font-mono text-xs text-destructive leading-relaxed" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full border border-accent/60 px-6 py-3 font-mono text-xs uppercase tracking-widest text-foreground hover:bg-accent hover:border-accent hover:text-accent-foreground transition-colors disabled:opacity-60"
              >
                {loading ? "Estimating…" : result ? "Re-estimate" : "Estimate usage →"}
              </button>
            </form>

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-6 border-t border-border/40 pt-6"
              >
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                      Est. monthly usage
                    </div>
                    <div className="font-display text-4xl tabular-nums tracking-tight leading-none text-accent">
                      {result.monthlyAvgKwh.toLocaleString()}
                      <span className="ml-1 text-base text-muted-foreground">kWh</span>
                    </div>
                  </div>
                  {(result.avgMonthlyCost != null || result.estBill) && (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                        Avg. monthly bill
                      </div>
                      <div className="font-display text-4xl tabular-nums tracking-tight leading-none text-foreground">
                        ${(result.avgMonthlyCost ?? result.estBill?.min ?? 0).toLocaleString()}
                      </div>
                      {result.estBill && (
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 tabular-nums">
                          ${result.estBill.min}–${result.estBill.max} range
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {result.graph.length > 0 && <UsageForecastChart graph={result.graph} compact />}

                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  <span className="text-accent">●</span> Estimated by WattBuy
                  {result.interpolated ? " · interpolated from area data" : ""}
                </p>

                <button
                  type="button"
                  onClick={apply}
                  className="mt-5 w-full border border-foreground bg-foreground text-background px-6 py-3 font-mono text-xs uppercase tracking-widest hover:bg-accent hover:border-accent hover:text-accent-foreground transition-colors"
                >
                  Use this estimate ({result.monthlyAvgKwh.toLocaleString()} kWh/mo) →
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
      {children}
    </span>
  );
}

const inputClass =
  "w-full bg-transparent border border-foreground/25 px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-accent transition-colors";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClass}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        placeholder={placeholder}
        className={`${inputClass} tabular-nums`}
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className={`${inputClass} text-muted-foreground cursor-default tabular-nums`}>{value}</div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
