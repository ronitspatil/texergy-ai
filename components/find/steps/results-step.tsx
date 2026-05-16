"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { WizardState } from "@/components/find/wizard-types";
import { SectionLabel } from "@/components/ui/section-label";
import { PlanCard } from "@/components/find/plan-card";
import { ResultsSidebar } from "@/components/find/results-sidebar";
import { buildRecommendBody, type ApiResponse } from "@/components/find/recommend-client";

export function ResultsStep({
  state,
  onUpdate,
  onBack,
}: {
  state: WizardState;
  onUpdate: (patch: Partial<WizardState>) => void;
  onBack: () => void;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Mobile/tablet: sidebar starts closed and opens via the Refine toggle.
  // `lg:` overrides force the panel always-visible on desktop.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Serialize the meaningful inputs so re-fetch triggers only when something
  // ranking-relevant changes (and not on, say, stepIndex).
  const inputKey = useMemo(
    () =>
      JSON.stringify({
        zip: state.zip,
        mode: state.mode,
        usage: state.monthlyUsageKwh,
        rate: state.rateTypePref,
        renew: state.renewablePref,
        term: state.termPref,
        w: state.weights,
      }),
    [state.zip, state.mode, state.monthlyUsageKwh, state.rateTypePref, state.renewablePref, state.termPref, state.weights],
  );

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRecommendBody(state)),
      });
      const body = (await res.json().catch(() => ({}))) as ApiResponse & { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch recommendations.");
      setData(null);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- inputKey covers all relevant fields
  }, [inputKey]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return (
    <div className="max-w-7xl mx-auto">
      <SectionLabel className="block mb-4">Your matches</SectionLabel>
      <h2 className="font-[family-name:var(--font-bebas)] text-foreground text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] tracking-tight mb-2">
        HERE&apos;S WHAT <span className="text-accent">FITS.</span>
      </h2>
      <p className="font-mono text-sm text-muted-foreground mb-10">
        {loading
          ? "Crunching plans…"
          : error
            ? "Couldn't load matches."
            : data
              ? `${data.candidateCount} plans available in ${data.tduCodes.join(", ") || "your area"} · showing top ${data.ranked.length}`
              : ""}
      </p>

      {/* Mobile/tablet: Refine toggle. Hidden on lg+ where the sidebar is
          always visible. */}
      <div className="lg:hidden mb-6">
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-expanded={sidebarOpen}
          aria-controls="results-refine-panel"
          className="w-full flex items-center justify-between border border-foreground/20 px-5 py-3 font-mono text-xs uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors"
        >
          <span>{sidebarOpen ? "Hide" : "Refine"} preferences</span>
          <motion.span
            animate={{ rotate: sidebarOpen ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            aria-hidden="true"
            className="text-accent"
          >
            ▾
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              id="results-refine-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-6">
                <ResultsSidebar state={state} onUpdate={onUpdate} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">
        <aside className="hidden lg:block lg:sticky lg:top-8 lg:self-start">
          <ResultsSidebar state={state} onUpdate={onUpdate} />
          <div className="mt-8 pt-6 border-t border-border/40">
            <button
              type="button"
              onClick={onBack}
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to {state.mode === "smart" ? "weights" : "profile"}
            </button>
          </div>
        </aside>

        <div>
          {error ? (
            <div className="border border-destructive/50 p-6 font-mono text-sm text-destructive">
              {error}
              <button
                type="button"
                onClick={fetchRecommendations}
                className="ml-4 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <LoadingSkeleton />
          ) : data && data.ranked.length === 0 ? (
            <div className="border border-border p-6 font-mono text-sm text-muted-foreground">
              No plans match those criteria. Try relaxing some filters in the sidebar.
            </div>
          ) : (
            <motion.ol
              className="space-y-4"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
              }}
            >
              {data?.ranked.map((r, i) => (
                <motion.li
                  key={r.plan.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
                  }}
                >
                  <PlanCard rank={i + 1} ranked={r} />
                </motion.li>
              ))}
            </motion.ol>
          )}

          {/* Mobile back-link mirrors the desktop sidebar's footer link. */}
          <div className="lg:hidden mt-8 pt-6 border-t border-border/40">
            <button
              type="button"
              onClick={onBack}
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to {state.mode === "smart" ? "weights" : "profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="border border-border p-6 animate-pulse">
          <div className="h-3 w-32 bg-muted/40 mb-3" />
          <div className="h-6 w-2/3 bg-muted/60 mb-4" />
          <div className="h-3 w-1/2 bg-muted/30" />
        </div>
      ))}
    </div>
  );
}
