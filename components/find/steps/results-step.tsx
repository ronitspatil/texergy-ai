"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SortBy, WizardState } from "@/components/find/wizard-types";
import { SORT_OPTIONS } from "@/components/find/wizard-types";
import { SectionLabel } from "@/components/ui/section-label";
import { PlanCard } from "@/components/find/plan-card";
import { ResultsSidebar } from "@/components/find/results-sidebar";
import { CompareDialog } from "@/components/find/compare-dialog";
import dynamic from "next/dynamic";
import { UsageEstimateModal } from "@/components/find/usage-estimate-modal";

/* Charts pull in recharts (~0.5 MB of JS). Loading them lazily keeps the
   wizard's initial bundle light — they only render on the results step. */
const chartFallback = <div className="h-40 animate-pulse bg-muted/20" aria-hidden="true" />;
const UsageForecastChart = dynamic(
  () => import("@/components/find/usage-forecast-chart").then((m) => m.UsageForecastChart),
  { ssr: false, loading: () => chartFallback },
);
const HistoricalPricingChart = dynamic(
  () => import("@/components/find/historical-pricing-chart").then((m) => m.HistoricalPricingChart),
  { ssr: false, loading: () => chartFallback },
);
import { buildRecommendBody, type ApiResponse } from "@/components/find/recommend-client";

const ZONE_LABELS: Record<string, string> = {
  COAST: "Houston coast",
  EAST: "East Texas",
  FWEST: "Far west Texas",
  NCENT: "DFW / north central",
  NORTH: "north Texas",
  SCENT: "Austin / central Texas",
  SOUTH: "south Texas",
  WEST: "west Texas",
};

function describeZone(zone: string): string {
  return ZONE_LABELS[zone] ?? "your ERCOT zone";
}

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
  // Holds the AbortController for the in-flight request so we can cancel it
  // when the user changes a filter before the previous fetch resolves.
  const abortRef = useRef<AbortController | null>(null);
  // Mobile/tablet: sidebar starts closed and opens via the Refine toggle.
  // `lg:` overrides force the panel always-visible on desktop.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Plan comparator: up to 3 selections, opens a full-screen side-by-side
  // dialog. State lives here (not in wizard) because it's transient UI.
  const COMPARE_MAX = 3;
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [comparing, setComparing] = useState(false);

  function toggleCompare(planId: number) {
    setCompareIds((ids) =>
      ids.includes(planId)
        ? ids.filter((x) => x !== planId)
        : ids.length >= COMPARE_MAX
          ? ids
          : [...ids, planId],
    );
  }

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
        tou: state.timeOfUsePref,
        base: state.baseChargePref,
        etf: state.etfPref,
        providers: state.providerIds,
        w: state.weights,
      }),
    [
      state.zip,
      state.mode,
      state.monthlyUsageKwh,
      state.rateTypePref,
      state.renewablePref,
      state.termPref,
      state.timeOfUsePref,
      state.baseChargePref,
      state.etfPref,
      state.providerIds,
      state.weights,
    ],
  );

  const fetchRecommendations = useCallback(async () => {
    // Cancel any in-flight request before starting a new one. This prevents
    // stale responses from overwriting fresher results when filters change rapidly.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRecommendBody(state)),
        signal: controller.signal,
      });
      const body = (await res.json().catch(() => ({}))) as ApiResponse & { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setData(body);
    } catch (err) {
      // AbortError is not a real failure — a newer request is already underway.
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Could not fetch recommendations.");
      setData(null);
    } finally {
      // Only clear loading if this controller is still the active one.
      if (abortRef.current === controller) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- inputKey covers all relevant fields
  }, [inputKey]);

  useEffect(() => {
    fetchRecommendations();
    // Cancel any in-flight request if the component unmounts (e.g., user navigates back).
    return () => { abortRef.current?.abort(); };
  }, [fetchRecommendations]);

  // Client-side sort: applied on top of the server-ranked list. "score" keeps
  // the engine's order; everything else does a numeric ascending sort using
  // fields already present on each RankedPlan. Plans missing the sort field
  // sink to the bottom so the visible list stays predictable.
  const sortedRanked = useMemo(() => {
    if (!data) return [];
    if (state.sortBy === "score") return data.ranked;
    const sorted = [...data.ranked];
    const keyFn: (r: (typeof sorted)[number]) => number = (() => {
      switch (state.sortBy) {
        case "rate":
          return (r) => r.effectiveCentsPerKwh;
        case "term":
          return (r) => r.plan.term_months ?? Number.POSITIVE_INFINITY;
        case "bill":
          return (r) => r.estMonthlyBillUsd;
        case "etf":
          return (r) => r.plan.etf_amount ?? Number.POSITIVE_INFINITY;
        default:
          return () => 0;
      }
    })();
    sorted.sort((a, b) => keyFn(a) - keyFn(b));
    return sorted;
  }, [data, state.sortBy]);

  return (
    <div className="w-full">
      <SectionLabel className="block mb-4">Your matches</SectionLabel>
      <h2 className="font-[family-name:var(--font-bebas)] text-foreground text-[clamp(2rem,5vw,4rem)] leading-[0.95] tracking-tight mb-2">
        HERE&apos;S WHAT <span className="text-accent">FITS.</span>
      </h2>
      <p className="font-mono text-xs sm:text-sm text-muted-foreground mb-2">
        {loading
          ? "Crunching plans…"
          : error
            ? "Couldn't load matches."
            : data
              ? `${data.ranked.length} plans available in ${data.tduCodes.join(", ") || "your area"}`
              : ""}
      </p>
      {!loading && !error && data?.profile && (
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-8 sm:mb-10">
          {data.profile.source === "meter_api"
            ? `Bill estimates based on ${describeZone(data.profile.weatherZone)} load curve`
            : `Bill estimates based on a typical Texas home`}
        </p>
      )}
      {!data?.profile && !loading && !error && <div className="mb-8 sm:mb-10" />}

      {/* Mobile/tablet: Refine toggle. Hidden on lg+ where the sidebar is
          always visible. */}
      <div className="lg:hidden mb-4 sm:mb-6">
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-expanded={sidebarOpen}
          aria-controls="results-refine-panel"
          className="w-full flex items-center justify-between border border-foreground/20 px-3 sm:px-5 py-2 sm:py-3 font-mono text-[10px] sm:text-xs uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors"
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

      <div className="grid lg:grid-cols-[240px_1fr] gap-3 sm:gap-4 md:gap-6 lg:gap-4 lg:pl-12">
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

        <div className="mx-auto max-w-[calc(100vw-24px)] sm:max-w-none lg:relative lg:h-full lg:w-full lg:max-w-none lg:mx-0">
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
          ) : data && (data.tduCodes.length === 0 || data.candidateCount === 0) ? (
            <div className="border border-border p-8 font-mono text-sm text-muted-foreground">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-3">
                Out of service area
              </div>
              <p className="text-foreground text-base leading-relaxed mb-3">
                ZIP {state.zip} isn&apos;t in a deregulated Texas electricity market.
              </p>
              <p className="leading-relaxed">
                Texergy AI works only for ZIPs served by an ERCOT retail provider
                (i.e. you can choose your supplier). Regulated areas like Austin
                Energy, CPS Energy, and electric co-ops aren&apos;t covered.
              </p>
            </div>
          ) : data && data.ranked.length === 0 ? (
            <div className="border border-border p-6 font-mono text-sm text-muted-foreground">
              No plans match those criteria. Try relaxing a filter in the sidebar.
            </div>
          ) : (
            <>
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 mx-auto max-w-full sm:max-w-none lg:-mt-16">
              <label htmlFor="sort-by" className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground whitespace-nowrap flex-shrink-0">
                Sort by
              </label>
              <select
                id="sort-by"
                value={state.sortBy}
                onChange={(e) => onUpdate({ sortBy: e.target.value as SortBy })}
                className="bg-background border border-foreground/25 px-2 sm:px-3 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:border-accent transition-colors flex-1 sm:flex-initial min-w-0 sm:min-w-auto truncate"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Fixed-height scroll container so the wizard header stays visible
                and the user scrolls within the list instead of the whole page.
                Wraps the scroller in a relative parent so we can layer top/bottom
                gradient fades that hint at more content above/below the fold. */}
            <div className="relative border border-border/40 bg-background/40 overflow-hidden mx-auto max-w-full sm:max-w-none lg:absolute lg:left-6 lg:right-0 lg:-top-5 lg:bottom-0 lg:flex lg:flex-col lg:min-h-0 lg:max-w-none lg:mx-0">
              <div
                // data-lenis-prevent tells the site-wide Lenis smooth-scroll
                // wrapper to leave wheel/touch events for this element alone,
                // so two-finger trackpad scrolling actually reaches the
                // container instead of getting swallowed by the page scroller.
                data-lenis-prevent="true"
                className="results-scroller max-h-[calc(100vh-280px)] lg:max-h-none lg:flex-1 lg:min-h-0 overflow-y-auto overscroll-contain"
                tabIndex={0}
                aria-label={`${sortedRanked.length} plan results — scroll to browse`}
              >
                <motion.ol
                  className="divide-y divide-border/40"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
                  }}
                >
                  {sortedRanked.map((r, i) => (
                    <motion.li
                      key={r.plan.id}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
                      }}
                    >
                      <PlanCard
                        rank={i + 1}
                        ranked={r}
                        selected={compareIds.includes(r.plan.id)}
                        onToggleSelect={() => toggleCompare(r.plan.id)}
                        selectionDisabled={compareIds.length >= COMPARE_MAX}
                      />
                    </motion.li>
                  ))}
                </motion.ol>
              </div>
              {/* Edge fades — purely decorative, hint at content above/below
                  the current scroll position. pointer-events-none so they
                  don't block clicks or scrolling. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background/90 to-transparent"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/95 to-transparent"
              />
              {/* Footer indicator that scrolling exists. */}
              <div className="border-t border-border/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground text-center">
                ↕ Scroll within · {sortedRanked.length} plans
              </div>
            </div>
            </>
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

      {!loading && !error && data && data.ranked.length > 0 && (
        <UsageForecastSection state={state} onUpdate={onUpdate} />
      )}

      {!loading && !error && data && data.tduCodes.length > 0 && (
        <HistoricalPricingSection tduCodes={data.tduCodes} />
      )}

      <CompareBar
        selected={sortedRanked.filter((r) => compareIds.includes(r.plan.id))}
        max={COMPARE_MAX}
        onRemove={(id) => toggleCompare(id)}
        onClear={() => setCompareIds([])}
        onOpen={() => setComparing(true)}
      />
      {comparing && (
        <CompareDialog
          plans={sortedRanked.filter((r) => compareIds.includes(r.plan.id))}
          onClose={() => setComparing(false)}
          onRemove={(id) => toggleCompare(id)}
        />
      )}
    </div>
  );
}

/** 12-month usage/cost forecast shown below the plan list. Only graphs once the
 *  user has run an address-based estimate — WattBuy's ZIP-only output skews high
 *  (its "average home in the area"), so we don't auto-fetch it here. Until then
 *  we invite the user to personalize. Never blocks the plan list. */
function UsageForecastSection({
  state,
  onUpdate,
}: {
  state: WizardState;
  onUpdate: (patch: Partial<WizardState>) => void;
}) {
  const [estimateOpen, setEstimateOpen] = useState(false);
  const estimate = state.usageEstimate;

  return (
    <section className="mt-12 sm:mt-16 border-t border-border/40 pt-10">
      <SectionLabel className="block mb-3">Your usage forecast</SectionLabel>
      <h3 className="font-[family-name:var(--font-bebas)] text-foreground text-[clamp(1.75rem,4vw,3rem)] leading-[0.95] tracking-tight mb-2">
        WHAT YOU&apos;LL <span className="text-accent">USE.</span>
      </h3>
      <p className="font-mono text-xs text-muted-foreground mb-6 max-w-2xl">
        {estimate
          ? "Forecast from the details you entered."
          : "Add your address for a personalized month-by-month forecast of your usage and cost."}
      </p>

      {estimate ? (
        <>
          <div className="border border-border/40 bg-background/40 p-4 sm:p-6">
            <UsageForecastChart graph={estimate.graph} />
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              <span className="text-accent">●</span> Estimated by WattBuy
              {estimate.interpolated ? " · interpolated from area data" : ""}
              {" · "}~{estimate.monthlyAvgKwh.toLocaleString()} kWh/mo avg
              {estimate.avgMonthlyCost != null ? ` · ~$${estimate.avgMonthlyCost.toLocaleString()}/mo avg` : ""}
            </p>
            <button
              type="button"
              onClick={() => setEstimateOpen(true)}
              className="font-mono text-[11px] text-accent underline underline-offset-4 decoration-accent/40 hover:decoration-accent transition-colors text-left"
            >
              Update my details →
            </button>
          </div>
        </>
      ) : (
        <div className="border border-border/40 bg-background/40 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="flex-1 font-mono text-xs text-muted-foreground leading-relaxed">
            Want a month-by-month forecast of your usage and cost? Add a few home
            details and we&apos;ll estimate it.
          </p>
          <button
            type="button"
            onClick={() => setEstimateOpen(true)}
            className="shrink-0 border border-accent/60 px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-accent hover:border-accent hover:text-accent-foreground transition-colors"
          >
            Estimate my usage →
          </button>
        </div>
      )}

      {estimateOpen && (
        <UsageEstimateModal
          zip={state.zip}
          onApply={(patch) => onUpdate(patch)}
          onClose={() => setEstimateOpen(false)}
        />
      )}
    </section>
  );
}

/** Live historical-pricing graph shown below the usage forecast. Plots the
 *  daily average ¢/kWh for the TDU(s) serving the entered ZIP, so the user can
 *  see whether the market is trending up or down before they lock in a plan. */
function HistoricalPricingSection({ tduCodes }: { tduCodes: string[] }) {
  return (
    <section className="mt-12 sm:mt-16 border-t border-border/40 pt-10">
      <SectionLabel className="block mb-3">Market price history</SectionLabel>
      <h3 className="font-[family-name:var(--font-bebas)] text-foreground text-[clamp(1.75rem,4vw,3rem)] leading-[0.95] tracking-tight mb-2">
        WHERE RATES ARE <span className="text-accent">HEADED.</span>
      </h3>
      <p className="font-mono text-xs text-muted-foreground mb-6 max-w-2xl">
        Daily average plan rate for the{" "}
        {tduCodes.length > 1 ? "utilities" : "utility"}{" "}
        serving your ZIP, captured every night. Use it to gauge whether the market&apos;s rising
        or falling before you lock in.
      </p>
      <div className="border border-border/40 bg-background/40 p-4 sm:p-6">
        <HistoricalPricingChart tduCodes={tduCodes} />
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
        <span className="text-accent">●</span> Average ¢/kWh across all active plans · updated daily
      </p>
    </section>
  );
}

/** Sticky bottom strip showing the currently selected compare-set. Visible
 *  whenever ≥1 plan is selected; "Compare" enabled at ≥2. Mirrors the
 *  EnergyBot pattern: small footprint, immediate access to the dialog. */
function CompareBar({
  selected,
  max,
  onRemove,
  onClear,
  onOpen,
}: {
  selected: import("@/lib/ranking/types").RankedPlan[];
  max: number;
  onRemove: (planId: number) => void;
  onClear: () => void;
  onOpen: () => void;
}) {
  if (selected.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="font-mono text-xs sm:text-sm uppercase tracking-[0.25em] text-muted-foreground shrink-0">
          Compare {selected.length}/{max}
        </div>
        <div className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto items-center gap-2.5 flex-1 min-w-0">
          {selected.map((r) => (
            <div
              key={r.plan.id}
              className="flex items-center gap-2.5 border border-foreground/20 pl-4 pr-2.5 py-2.5 max-w-full sm:min-w-0"
            >
              <span className="font-mono text-sm text-foreground break-words max-w-[320px] leading-snug">
                {r.plan.rep_name} · {r.plan.name}
              </span>
              <button
                type="button"
                onClick={() => onRemove(r.plan.id)}
                aria-label={`Remove ${r.plan.rep_name} ${r.plan.name} from comparison`}
                className="text-muted-foreground hover:text-accent transition-colors font-mono text-base leading-none"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={onClear}
            className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onOpen}
            disabled={selected.length < 2}
            className="border border-foreground bg-foreground text-background px-7 py-3 font-mono text-sm uppercase tracking-widest hover:bg-accent hover:border-accent hover:text-accent-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Compare →
          </button>
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
