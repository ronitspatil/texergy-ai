"use client";

import { useState, useEffect, useRef } from "react";
import type { RankedPlan } from "@/lib/ranking/types";
import Link from "next/link";

type Provider = { id: number; name: string };

type FormState = {
  zip: string;
  amountDue: string;
  usageKwh: string;
  heatingType: "gas" | "electric" | "unknown";
  currentProvider: string;
};

type CalcResult = {
  currentMonthly: number;
  bestPlan: RankedPlan;
  secondPlan: RankedPlan | null;
  monthlySavings: number;
  annualSavings: number;
  savingsPct: number;
  isAlreadyCheap: boolean;
};

const INITIAL: FormState = {
  zip: "",
  amountDue: "",
  usageKwh: "",
  heatingType: "gas",
  currentProvider: "",
};

export function SavingsCalculator() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((d) => setProviders(d.providers ?? []))
      .catch(() => {});
  }, []);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setResult(null);
    setError(null);
  }

  async function calculate() {
    const currentMonthly = parseFloat(form.amountDue);
    const usageKwh = parseInt(form.usageKwh, 10);

    if (!/^\d{5}$/.test(form.zip)) return setError("Enter a valid 5-digit ZIP code.");
    if (!currentMonthly || currentMonthly < 5) return setError("Enter a valid bill amount.");
    if (!usageKwh || usageKwh < 50) return setError("Enter a valid usage (min 50 kWh).");

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip: form.zip, monthlyUsageKwh: usageKwh, limit: 5 }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
      }

      const data = await res.json() as { ranked: RankedPlan[] };
      const ranked = data.ranked ?? [];

      if (ranked.length === 0) {
        throw new Error("No plans found for this ZIP. Try a nearby Texas ZIP code.");
      }

      const bestPlan = ranked[0];
      const monthlySavings = currentMonthly - bestPlan.estMonthlyBillUsd;
      const annualSavings = monthlySavings * 12;
      const savingsPct = (monthlySavings / currentMonthly) * 100;

      setResult({
        currentMonthly,
        bestPlan,
        secondPlan: ranked[1] ?? null,
        monthlySavings,
        annualSavings,
        savingsPct,
        isAlreadyCheap: monthlySavings <= 2,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Form */}
      <div className="border border-border/40 rounded-lg p-6 md:p-8 bg-background/40 space-y-8">

        {/* Row 1: ZIP + bill amount + usage */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
          <Field label="ZIP Code" hint="Texas 5-digit ZIP">
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 77002"
              value={form.zip}
              onChange={(e) => set("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="w-full bg-transparent border border-foreground/25 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors"
            />
          </Field>
          <Field label="Amount Due ($)" hint="From your most recent bill">
            <input
              type="number"
              min={5}
              max={10000}
              step={0.01}
              placeholder="e.g. 148.50"
              value={form.amountDue}
              onChange={(e) => set("amountDue", e.target.value)}
              className="w-full bg-transparent border border-foreground/25 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors"
            />
          </Field>
          <Field label="Total Usage (kWh)" hint="From your most recent bill">
            <input
              type="number"
              min={50}
              max={20000}
              step={1}
              placeholder="e.g. 1200"
              value={form.usageKwh}
              onChange={(e) => set("usageKwh", e.target.value)}
              className="w-full bg-transparent border border-foreground/25 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors"
            />
          </Field>
        </div>

        {/* Row 2: heating + provider */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
          <Field label="Heating Type" hint="Affects seasonal usage patterns">
            <div className="flex gap-3">
              {(["gas", "electric", "unknown"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("heatingType", v)}
                  className={`flex-1 py-3 font-mono text-xs uppercase tracking-[0.2em] border transition-colors ${
                    form.heatingType === v
                      ? "border-accent text-accent bg-accent/5"
                      : "border-foreground/20 text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {v === "unknown" ? "Not sure" : v}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Current Provider" hint="Optional — leave blank if unsure">
            <ProviderSelect
              providers={providers}
              value={form.currentProvider}
              onChange={(v) => set("currentProvider", v)}
            />
          </Field>
        </div>

        {error && (
          <p className="font-mono text-xs text-red-400">{error}</p>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={calculate}
            disabled={loading}
            className="px-8 py-3 bg-accent text-background font-mono text-xs uppercase tracking-[0.3em] hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Calculating…" : "Calculate →"}
          </button>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
            No signup required. Your data stays in the browser.
          </p>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {result.isAlreadyCheap ? (
            <AlreadyCheap result={result} form={form} />
          ) : (
            <SavingsResults result={result} form={form} />
          )}
        </div>
      )}
    </div>
  );
}

function ProviderSelect({
  providers,
  value,
  onChange,
}: {
  providers: Provider[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  function handleWheel(e: React.WheelEvent<HTMLUListElement>) {
    const el = listRef.current;
    if (!el) return;
    e.stopPropagation();
    e.preventDefault();
    el.scrollTop += e.deltaY;
  }

  const filtered = query.trim()
    ? providers.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : providers;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(name: string) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="w-full flex items-center justify-between bg-transparent border border-foreground/25 px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-accent transition-colors hover:border-foreground/40"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground/50"}>
          {value || "Select provider…"}
        </span>
        <span className="flex items-center gap-2 shrink-0 ml-2">
          {value && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="text-muted-foreground/60 hover:text-foreground transition-colors leading-none"
              aria-label="Clear"
            >
              ×
            </span>
          )}
          <svg
            width="10" height="6" viewBox="0 0 10 6" fill="none"
            className={`transition-transform duration-200 text-muted-foreground ${open ? "rotate-180" : ""}`}
          >
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border/60 shadow-lg">
          {/* Search */}
          <div className="border-b border-border/40 px-3 py-2 flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground shrink-0">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search providers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
          </div>

          {/* Options */}
          <ul
            ref={listRef}
            onWheel={handleWheel}
            className="max-h-52 overflow-y-scroll overscroll-contain"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 font-mono text-xs text-muted-foreground">No providers found</li>
            ) : (
              filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => select(p.name)}
                    className={`w-full text-left px-4 py-2.5 font-mono text-xs transition-colors ${
                      value === p.name
                        ? "text-accent bg-accent/8"
                        : "text-foreground hover:bg-foreground/5"
                    }`}
                  >
                    {p.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </div>
        {hint && (
          <div className="font-mono text-[10px] text-muted-foreground/50 mt-0.5">{hint}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function SavingsResults({ result, form }: { result: CalcResult; form: FormState }) {
  const { currentMonthly, bestPlan, secondPlan, monthlySavings, annualSavings, savingsPct } = result;
  const currentEffective = currentMonthly / parseInt(form.usageKwh || "1000", 10) * 100;
  const providerLabel = form.currentProvider.trim() || "your current plan";

  return (
    <>
      {/* Hero savings callout */}
      <div className="border border-accent/40 rounded-lg p-6 md:p-8 bg-accent/5">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-4">
          12-month projection
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Stat
            label="Projected annual savings"
            value={`$${Math.round(annualSavings).toLocaleString()}`}
            highlight
          />
          <Stat
            label="Monthly savings"
            value={`$${Math.abs(monthlySavings).toFixed(2)}`}
          />
          <Stat
            label="Savings rate"
            value={`${savingsPct.toFixed(0)}%`}
          />
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Current */}
        <div className="border border-border/40 rounded-lg p-5 bg-background/40">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
            Current — {providerLabel}
          </div>
          <div className="font-[var(--font-bebas)] text-4xl text-foreground tabular-nums">
            ${currentMonthly.toFixed(2)}
            <span className="font-mono text-base text-muted-foreground ml-1">/mo</span>
          </div>
          <div className="mt-2 font-mono text-xs text-muted-foreground">
            {currentEffective.toFixed(1)}¢ / kWh effective rate
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            ${(currentMonthly * 12).toFixed(0)} / year
          </div>
        </div>

        {/* Best plan */}
        <div className="border border-accent/50 rounded-lg p-5 bg-accent/5 relative overflow-hidden">
          <div className="absolute top-3 right-3 font-mono text-[8px] uppercase tracking-[0.3em] text-accent border border-accent/40 px-2 py-0.5">
            Best available
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-accent mb-3">
            {bestPlan.plan.rep_name} — {bestPlan.plan.name}
          </div>
          <div className="font-[var(--font-bebas)] text-4xl text-foreground tabular-nums">
            ${bestPlan.estMonthlyBillUsd.toFixed(2)}
            <span className="font-mono text-base text-muted-foreground ml-1">/mo</span>
          </div>
          <div className="mt-2 font-mono text-xs text-muted-foreground">
            {bestPlan.effectiveCentsPerKwh.toFixed(1)}¢ / kWh effective rate
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            ${bestPlan.estAnnualCostUsd.toFixed(0)} / year
          </div>
          <PlanBadges plan={bestPlan} />
        </div>
      </div>

      {/* Second best */}
      {secondPlan && (
        <div className="border border-border/30 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-background/40">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
              Runner-up
            </div>
            <div className="font-mono text-sm text-foreground">
              {secondPlan.plan.rep_name} — {secondPlan.plan.name}
            </div>
            <div className="font-mono text-xs text-muted-foreground mt-0.5">
              {secondPlan.effectiveCentsPerKwh.toFixed(1)}¢/kWh effective &nbsp;·&nbsp;{" "}
              {secondPlan.plan.rate_type ?? "Unknown"} rate
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <div className="font-[var(--font-bebas)] text-2xl tabular-nums">
              ${secondPlan.estMonthlyBillUsd.toFixed(2)}/mo
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              Save ${(currentMonthly - secondPlan.estMonthlyBillUsd).toFixed(2)}/mo vs current
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="border border-border/40 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center gap-4 bg-background/40">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm text-foreground/80 leading-relaxed">
            Ready to see the full ranked list — renewal dates, ETFs, bill credits
            and all?
          </p>
        </div>
        <Link
          href={`/?zip=${form.zip}`}
          className="shrink-0 px-6 py-3 bg-accent text-background font-mono text-xs uppercase tracking-[0.3em] hover:bg-accent/90 transition-colors whitespace-nowrap"
        >
          Find my plan →
        </Link>
      </div>
    </>
  );
}

function AlreadyCheap({ result, form }: { result: CalcResult; form: FormState }) {
  const { currentMonthly, bestPlan } = result;
  const providerLabel = form.currentProvider.trim() || "your current plan";
  const diff = currentMonthly - bestPlan.estMonthlyBillUsd;

  return (
    <>
      <div className="border border-border/40 rounded-lg p-6 md:p-8 bg-background/40">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
          Result
        </div>
        <h3 className="font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight leading-none text-foreground mb-4">
          {diff >= 0 ? "YOU'RE ALREADY NEAR THE BEST RATE." : "YOU COULD BE PAYING LESS."}
        </h3>
        <p className="font-mono text-sm text-muted-foreground leading-relaxed max-w-xl">
          {diff >= 0
            ? `The cheapest plan available in your ZIP (${bestPlan.plan.rep_name} — ${bestPlan.plan.name} at $${bestPlan.estMonthlyBillUsd.toFixed(2)}/mo) is within $${Math.abs(diff).toFixed(2)} of what you paid with ${providerLabel}. You're in good shape — or close to it.`
            : `Switching from ${providerLabel} to ${bestPlan.plan.rep_name} — ${bestPlan.plan.name} could save you $${Math.abs(diff).toFixed(2)}/month at your current usage.`}
        </p>
      </div>
      <div className="border border-border/40 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center gap-4 bg-background/40">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm text-foreground/80 leading-relaxed">
            See the full ranked list — rate type, renewable %, term, bill credits and all.
          </p>
        </div>
        <Link
          href={`/?zip=${form.zip}`}
          className="shrink-0 px-6 py-3 bg-accent text-background font-mono text-xs uppercase tracking-[0.3em] hover:bg-accent/90 transition-colors whitespace-nowrap"
        >
          View all plans →
        </Link>
      </div>
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`font-[var(--font-bebas)] text-4xl tabular-nums tracking-tight ${highlight ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function PlanBadges({ plan }: { plan: RankedPlan }) {
  const badges: string[] = [];
  if (plan.plan.rate_type) badges.push(plan.plan.rate_type);
  if (plan.plan.renewable_pct != null && plan.plan.renewable_pct >= 80) badges.push(`${plan.plan.renewable_pct}% renewable`);
  if ((plan.plan.etf_amount ?? 0) === 0 && (plan.plan.term_months ?? 0) <= 1) badges.push("No ETF");
  if (!badges.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {badges.map((b) => (
        <span key={b} className="font-mono text-[9px] uppercase tracking-[0.2em] border border-accent/30 text-accent px-2 py-0.5">
          {b}
        </span>
      ))}
    </div>
  );
}
