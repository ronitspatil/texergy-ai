"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { RankedPlan } from "@/lib/ranking/types";

export function PlanCard({ rank, ranked }: { rank: number; ranked: RankedPlan }) {
  const [open, setOpen] = useState(false);
  const { plan } = ranked;

  return (
    <article className="border border-border bg-card transition-colors hover:border-foreground/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-5 md:p-6 flex flex-col md:flex-row md:items-start md:gap-6"
        aria-expanded={open}
      >
        <div className="flex items-baseline gap-4 md:w-48 md:flex-shrink-0">
          <span className="font-mono text-2xl text-accent tabular-nums w-10">
            {String(rank).padStart(2, "0")}
          </span>
          <div className="flex flex-col">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {plan.rep_name}
            </span>
          </div>
        </div>

        <div className="flex-1 mt-3 md:mt-0 min-w-0">
          <div className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl tracking-tight text-foreground leading-tight">
            {plan.name}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge>{plan.rate_type ?? "—"}</Badge>
            <Badge>
              {plan.term_months == null
                ? "Month-to-month"
                : plan.term_months === 1
                  ? "M2M"
                  : `${plan.term_months} mo`}
            </Badge>
            {plan.renewable_pct != null && (
              <Badge accent={plan.renewable_pct >= 90}>
                {plan.renewable_pct}% green
              </Badge>
            )}
            {plan.prepaid && <Badge>Prepaid</Badge>}
          </div>
          {ranked.reasons.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5">
              {ranked.reasons.slice(0, 2).map((r) => (
                <li key={r} className="font-mono text-xs text-foreground/80 flex gap-2">
                  <span className="text-accent">→</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="md:w-40 md:flex-shrink-0 mt-4 md:mt-0 md:text-right">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            est. monthly
          </div>
          <div className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl tracking-tight text-foreground tabular-nums leading-none mt-1">
            ${Math.round(ranked.estMonthlyBillUsd)}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2">
            {ranked.costSource === "parsed_efl" ? "from EFL" : "from PTC avg"}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border/60"
          >
            <div className="px-5 md:px-6 py-6">
              <div className="grid md:grid-cols-2 gap-6">
                <ScoreBars breakdown={ranked.breakdown} />
                <Details ranked={ranked} />
              </div>
              <div className="mt-6 pt-6 border-t border-border/60 flex flex-col sm:flex-row gap-3">
                {plan.efl_url && (
                  <a
                    href={plan.efl_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="border border-foreground/25 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors text-center"
                  >
                    View EFL (PDF) →
                  </a>
                )}
                {plan.enroll_url && (
                  <a
                    href={plan.enroll_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="border border-foreground bg-foreground text-background px-5 py-2.5 font-mono text-xs uppercase tracking-widest hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors text-center"
                  >
                    Enroll at {plan.rep_name} →
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function Badge({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={[
        "font-mono text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 border",
        accent
          ? "border-accent text-accent"
          : "border-border text-muted-foreground",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function ScoreBars({ breakdown }: { breakdown: import("@/lib/ranking/types").Breakdown }) {
  const factors: { key: keyof typeof breakdown; label: string }[] = [
    { key: "cost", label: "Cost" },
    { key: "renewable", label: "Renewable" },
    { key: "contractFlexibility", label: "Flexibility" },
    { key: "rateStability", label: "Stability" },
    { key: "ratings", label: "Ratings" },
  ];
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-3">
        Score breakdown
      </div>
      <ul className="space-y-2">
        {factors.map((f, idx) => {
          const v = breakdown[f.key];
          return (
            <li key={f.key} className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground w-24">{f.label}</span>
              <div className="flex-1 h-1.5 bg-muted/40 relative">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(v * 100)}%` }}
                  transition={{
                    duration: 0.55,
                    delay: 0.08 + idx * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </div>
              <span className="font-mono text-xs text-foreground tabular-nums w-8 text-right">
                {Math.round(v * 100)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Details({ ranked }: { ranked: RankedPlan }) {
  const { plan } = ranked;
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-3">
        Plan details
      </div>
      <dl className="space-y-2 font-mono text-xs">
        <Row label="Annual estimate" value={`$${Math.round(ranked.estAnnualCostUsd).toLocaleString()}`} />
        <Row
          label="Energy charge"
          value={
            plan.energy_charge
              ? `${plan.energy_charge.cents_per_kwh}¢ / kWh`
              : plan.rate_1000_kwh != null
                ? `${plan.rate_1000_kwh}¢ / kWh (avg @ 1000)`
                : "—"
          }
        />
        <Row label="Base charge" value={plan.base_charge != null ? `$${plan.base_charge.toFixed(2)} / mo` : "—"} />
        <Row label="Termination fee" value={plan.etf_amount != null ? `$${plan.etf_amount.toFixed(0)}` : "—"} />
        {plan.bill_credits && (
          <Row
            label="Bill credit"
            value={`$${plan.bill_credits.amount} at ${plan.bill_credits.threshold_kwh.toLocaleString()}+ kWh`}
          />
        )}
        {plan.tdu_charges && (
          <Row
            label="TDU pass-through"
            value={`${plan.tdu_charges.per_kwh_cents ?? "?"}¢ / kWh${plan.tdu_charges.per_month_usd != null ? ` + $${plan.tdu_charges.per_month_usd}/mo` : ""}`}
          />
        )}
        <Row label="TDU" value={plan.tdu_code} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-muted-foreground w-32 flex-shrink-0">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
