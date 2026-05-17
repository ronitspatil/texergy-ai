export type Step = { label: string; active: boolean; done: boolean };

export function ProgressBar({ steps }: { steps: Readonly<Step[]> }) {
  return (
    // w-fit + mx-auto centers the bar; labels size to content so they don't
    // distort the connectors. Connectors are a fixed width (w-16 = 64px) so
    // they're identical between every pair of step labels regardless of the
    // label text length.
    <ol className="flex items-center gap-3 w-fit mx-auto" aria-label="Progress">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-center gap-3">
          <span
            className={[
              "font-mono text-[10px] uppercase tracking-[0.3em] whitespace-nowrap",
              step.active
                ? "text-accent"
                : step.done
                  ? "text-foreground"
                  : "text-muted-foreground",
            ].join(" ")}
          >
            {String(i + 1).padStart(2, "0")} / {step.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={[
                "w-16 h-px shrink-0",
                step.done ? "bg-foreground/60" : "bg-border/60",
              ].join(" ")}
              aria-hidden="true"
            />
          )}
        </li>
      ))}
    </ol>
  );
}
