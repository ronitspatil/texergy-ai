"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { RankedPlan } from "@/lib/ranking/types";

const SUGGESTED_QUESTIONS = [
  "Which plan is cheapest for me overall?",
  "What are the biggest tradeoffs between these plans?",
  "Which plan is safest if my usage fluctuates month to month?",
  "How risky are the bill credits in these plans?",
];

function AskBot({ plans }: { plans: RankedPlan[] }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const payload = {
        question: trimmed,
        plans: plans.map((r) => ({
          rep_name: r.plan.rep_name,
          name: r.plan.name,
          rate_type: r.plan.rate_type,
          term_months: r.plan.term_months,
          renewable_pct: r.plan.renewable_pct,
          base_charge: r.plan.base_charge,
          etf_amount: r.plan.etf_amount,
          time_of_use: r.plan.time_of_use,
          bill_credits: r.plan.bill_credits,
          effectiveCentsPerKwh: r.effectiveCentsPerKwh,
          estMonthlyBillUsd: r.estMonthlyBillUsd,
          estAnnualCostUsd: r.estAnnualCostUsd,
          reasons: r.reasons,
        })),
      };
      const res = await fetch("/api/ask-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        answer?: string;
        reason?: string;
      };
      if (res.status === 429) {
        setError(
          data.reason === "global_rate_limited"
            ? "Texergy Bot is taking a breather — we've hit the daily AI cap. Try again tomorrow."
            : "You're asking faster than the bot can keep up. Wait a few minutes and try again.",
        );
      } else if (!res.ok || !data.ok || !data.answer) {
        setError("Texergy Bot is unavailable right now. Try again in a moment.");
      } else {
        setAnswer(data.answer);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-label="Ask Texergy Bot"
      className="max-w-7xl mx-auto mt-8 sm:mt-12 border border-border/60 bg-background/40 p-4 sm:p-6 md:p-8"
    >
      <div className="flex items-baseline justify-between gap-2 sm:gap-4 flex-col sm:flex-row">
        <div>
          <div className="font-mono text-[8px] sm:text-[10px] uppercase tracking-[0.3em] text-accent">
            AI Insight
          </div>
          <h3 className="mt-1 sm:mt-2 font-display text-xl sm:text-2xl md:text-3xl tracking-tight leading-none">
            ASK TEXERGY BOT.
          </h3>
        </div>
        <p className="font-mono text-[10px] sm:text-[11px] text-muted-foreground max-w-md">
          Grounded in the {plans.length} {plans.length === 1 ? "plan" : "plans"} above. No marketing
          fluff, no invented numbers.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={loading}
            onClick={() => {
              setQuestion(q);
              void ask(q);
            }}
            className="border border-border/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:border-accent hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        className="mt-5 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about these plans…"
          maxLength={500}
          disabled={loading}
          aria-label="Your question"
          className="flex-1 bg-transparent border border-border/60 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={loading || question.trim().length === 0}
          className="border border-foreground bg-foreground text-background px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] hover:bg-accent hover:border-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Thinking…" : "Ask →"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-5 border border-destructive/50 bg-destructive/5 px-4 py-3 font-mono text-xs text-destructive"
        >
          {error}
        </div>
      )}

      {answer && (
        <div className="mt-5 border-l-2 border-accent bg-background/60 px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-2">
            Texergy Bot
          </div>
          <div className="font-mono text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {answer}
          </div>
          <div className="mt-3 font-mono text-[10px] text-muted-foreground">
            AI-generated. Verify rates and terms against each plan's EFL before enrolling.
          </div>
        </div>
      )}
    </section>
  );
}

/** Full-screen side-by-side comparison of 2–3 selected plans. Each plan is a
 *  column; rows are individual fields. Modeled after EnergyBot's "compare
 *  plans" overlay — same row vocabulary but rendered in our editorial style.
 */
export function CompareDialog({
  plans,
  onClose,
  onRemove,
}: {
  plans: RankedPlan[];
  onClose: () => void;
  onRemove: (planId: number) => void;
}) {
  // Close on Escape; freeze the page underneath. We pin <body> to its current
  // scroll position with position:fixed (and restore on close) — this is the
  // only reliable way to block scrolling when a smooth-scroll library like
  // Lenis is running, because plain `overflow:hidden` on body doesn't stop it.
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
      bodyLeft: document.body.style.left,
      bodyRight: document.body.style.right,
      bodyWidth: document.body.style.width,
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev.htmlOverflow;
      document.body.style.position = prev.bodyPosition;
      document.body.style.top = prev.bodyTop;
      document.body.style.left = prev.bodyLeft;
      document.body.style.right = prev.bodyRight;
      document.body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="compare-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-y-auto"
        data-lenis-prevent="true"
        role="dialog"
        aria-modal="true"
        aria-label="Compare selected plans"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="px-4 md:px-8 py-4 sm:py-6 md:py-8 flex flex-col"
        >
          {/* Header - fixed at top of modal so it's always accessible */}
          <div className="mb-4 sm:mb-6 md:mb-8 pb-3 sm:pb-4 border-b border-border/40">
            <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-2 sm:gap-4">
              <div>
                <div className="font-mono text-[8px] sm:text-[10px] uppercase tracking-[0.3em] text-accent">
                  Side-by-side
                </div>
                <h2 className="mt-1 sm:mt-2 font-display text-2xl sm:text-3xl md:text-5xl tracking-tight leading-none">
                  COMPARE PLANS.
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="border border-foreground/25 px-2 sm:px-4 py-1 sm:py-2 font-mono text-[10px] sm:text-xs uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors whitespace-nowrap shrink-0"
              >
                Close ✕
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="max-w-7xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse table-fixed text-sm md:text-base">
              <colgroup>
                <col style={{ width: "6rem" }} className="sm:w-44" />
                {plans.map((r) => (
                  <col key={r.plan.id} style={{ width: `calc((100% - 6rem) / ${plans.length})` }} className="sm:w-auto" />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="text-left align-bottom pb-2 sm:pb-4 pr-2 sm:pr-6 font-mono text-[8px] sm:text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
                  >
                    &nbsp;
                  </th>
                  {plans.map((r) => (
                    <th
                      key={r.plan.id}
                      scope="col"
                      className="text-left align-bottom pb-2 sm:pb-4 px-2 sm:px-4 border-b border-border/60"
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          {r.plan.rep_logo_url ? (
                            <img
                              src={r.plan.rep_logo_url}
                              alt={r.plan.rep_name}
                              className="h-4 sm:h-7 w-auto max-w-[80px] sm:max-w-[140px] object-contain object-left mb-1 sm:mb-2"
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : null}
                          <div className="font-mono text-[7px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground break-words leading-relaxed">
                            {r.plan.rep_name}
                          </div>
                          <div className="mt-0.5 sm:mt-1 font-display text-sm sm:text-xl tracking-tight text-foreground leading-tight">
                            {r.plan.name}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(r.plan.id)}
                          aria-label={`Remove ${r.plan.rep_name} ${r.plan.name} from comparison`}
                          className="shrink-0 text-muted-foreground hover:text-accent transition-colors font-mono text-base sm:text-lg leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <Row label="Effective rate">
                  {plans.map((r) => (
                    <Cell key={r.plan.id}>
                      <span className="font-display text-lg sm:text-2xl tracking-tight text-foreground">
                        {(r.effectiveCentsPerKwh ?? 0).toFixed(1)}
                        <span className="text-xs sm:text-base text-muted-foreground ml-1">¢/kWh</span>
                      </span>
                    </Cell>
                  ))}
                </Row>
                <Row label="Rate type">
                  {plans.map((r) => (
                    <Cell key={r.plan.id}>{r.plan.rate_type ?? "—"}</Cell>
                  ))}
                </Row>
                <Row label="Term">
                  {plans.map((r) => (
                    <Cell key={r.plan.id}>
                      {r.plan.term_months == null
                        ? "Month-to-month"
                        : r.plan.term_months === 1
                          ? "Month-to-month"
                          : `${r.plan.term_months} months`}
                    </Cell>
                  ))}
                </Row>
                <Row label="Est. monthly bill">
                  {plans.map((r) => (
                    <Cell key={r.plan.id}>${(r.estMonthlyBillUsd ?? 0).toFixed(2)}</Cell>
                  ))}
                </Row>
                <Row label="Est. annual cost">
                  {plans.map((r) => (
                    <Cell key={r.plan.id}>${(r.estAnnualCostUsd ?? 0).toFixed(2)}</Cell>
                  ))}
                </Row>
                <Row label="Renewable">
                  {plans.map((r) => (
                    <Cell key={r.plan.id}>
                      {r.plan.renewable_pct == null ? "—" : `${r.plan.renewable_pct}%`}
                    </Cell>
                  ))}
                </Row>
                <Row label="Base charge">
                  {plans.map((r) => (
                    <Cell key={r.plan.id}>
                      {r.plan.base_charge == null ? "—" : `$${r.plan.base_charge.toFixed(2)}/mo`}
                    </Cell>
                  ))}
                </Row>
                <Row label="Termination fee">
                  {plans.map((r) => (
                    <Cell key={r.plan.id}>
                      {r.plan.etf_amount == null
                        ? "—"
                        : r.plan.etf_amount === 0
                          ? "None"
                          : `$${r.plan.etf_amount.toFixed(0)}`}
                    </Cell>
                  ))}
                </Row>
                <Row label="Bill credit">
                  {plans.map((r) => (
                    <Cell key={r.plan.id}>
                      {r.plan.bill_credits ? (
                        <span>
                          ${r.plan.bill_credits.amount} at{" "}
                          {r.plan.bill_credits.threshold_kwh.toLocaleString()}+ kWh
                        </span>
                      ) : (
                        "—"
                      )}
                    </Cell>
                  ))}
                </Row>
                <Row label="Time of use">
                  {plans.map((r) => (
                    <Cell key={r.plan.id}>{r.plan.time_of_use ? "Yes" : "No"}</Cell>
                  ))}
                </Row>
                <Row label="Highlights">
                  {plans.map((r) => (
                    <Cell key={r.plan.id}>
                      {r.reasons.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <ul className="space-y-1">
                          {r.reasons.slice(0, 3).map((reason) => (
                            <li key={reason} className="flex gap-2">
                              <span className="text-accent shrink-0">→</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Cell>
                  ))}
                </Row>
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-6 pr-6">&nbsp;</td>
                  {plans.map((r) => (
                    <td key={r.plan.id} className="pt-3 sm:pt-6 px-2 sm:px-4">
                      <div className="flex flex-col gap-1 sm:gap-2">
                        {r.plan.efl_url && (
                          <a
                            href={r.plan.efl_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="border border-foreground/25 px-2 sm:px-3 py-1 sm:py-2 font-mono text-[8px] sm:text-[10px] uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors text-center"
                          >
                            View EFL →
                          </a>
                        )}
                        {r.plan.enroll_url && (
                          <a
                            href={r.plan.enroll_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="border border-foreground bg-foreground text-background px-2 sm:px-3 py-1 sm:py-2 font-mono text-[8px] sm:text-[10px] uppercase tracking-widest hover:bg-accent hover:border-accent hover:text-accent-foreground transition-colors text-center"
                          >
                            Enroll →
                          </a>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          {plans.length > 0 && <AskBot plans={plans} />}

          {plans.length === 0 && (
            <div className="max-w-3xl mx-auto mt-8 border border-border p-6 font-mono text-sm text-muted-foreground">
              No plans selected to compare.
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th
        scope="row"
        className="text-left align-top py-2 sm:py-4 pr-2 sm:pr-6 font-mono text-[8px] sm:text-[10px] uppercase tracking-[0.25em] text-accent"
      >
        {label}
      </th>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td className="align-top py-2 sm:py-4 px-2 sm:px-4 font-mono text-xs sm:text-sm text-foreground/90 leading-relaxed">
      {children}
    </td>
  );
}
