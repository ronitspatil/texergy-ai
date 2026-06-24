export type Step = { label: string; active: boolean; done: boolean };

export function ProgressBar({ steps }: { steps: Readonly<Step[]> }) {
  const total = steps.length;
  // The active step is "where you are." Anchor the fill there. Fall back to the
  // last completed step if nothing is marked active.
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.active) !== -1
      ? steps.findIndex((s) => s.active)
      : steps.filter((s) => s.done).length,
  );
  // Position of each node (and the fill edge) along the track, 0–100%.
  const pct = total > 1 ? (activeIndex / (total - 1)) * 100 : 0;

  return (
    <div
      className="mx-auto w-full max-w-xl"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={activeIndex + 1}
      aria-valuetext={`Step ${activeIndex + 1} of ${total}: ${steps[activeIndex]?.label ?? ""}`}
    >
      {/* Track. Horizontal padding leaves room so the edge nodes never clip at
          the 0%/100% extremes. We drop the bottom padding (the labels provide
          the lower content) so the header's own padding leaves balanced space. */}
      <div className="relative px-3.5 pt-3 pb-0">
        <div className="relative h-1.5 rounded-full bg-border/60">
          {/* Filled portion up to the current step. */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />

          {/* Step nodes sitting on the track. The outer circle stays defined
              (a ring) at every stage; once the fill reaches it, an inner dot
              fills the circle. */}
          {steps.map((step, i) => {
            const nodePct = total > 1 ? (i / (total - 1)) * 100 : 0;
            const reached = step.done || step.active;
            return (
              <span
                key={step.label}
                aria-hidden="true"
                className={[
                  "absolute top-1/2 flex size-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background transition-colors duration-300",
                  reached ? "border-accent" : "border-border",
                ].join(" ")}
                style={{ left: `${nodePct}%` }}
              >
                {reached && <span className="size-2.5 rounded-full bg-accent" />}
              </span>
            );
          })}
        </div>

        {/* Labels centered under each node — every step, including the first
            and last, sits dead-center beneath its dot. The track's horizontal
            padding leaves room so the edge labels don't clip. */}
        <div className="relative mt-3 h-2.5">
          {steps.map((step, i) => {
            const nodePct = total > 1 ? (i / (total - 1)) * 100 : 0;
            return (
              <span
                key={step.label}
                className={[
                  "absolute -translate-x-1/2 font-mono text-[8px] sm:text-[10px] leading-none uppercase tracking-[0.15em] sm:tracking-[0.25em] whitespace-nowrap transition-colors",
                  step.active
                    ? "text-accent"
                    : step.done
                      ? "text-foreground"
                      : "text-muted-foreground",
                ].join(" ")}
                style={{ left: `${nodePct}%` }}
              >
                {step.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
