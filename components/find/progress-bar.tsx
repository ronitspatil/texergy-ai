export type Step = { label: string; active: boolean; done: boolean };

export function ProgressBar({ steps }: { steps: Readonly<Step[]> }) {
  return (
    <ol className="flex items-center gap-3 max-w-2xl mx-auto" aria-label="Progress">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-center gap-3 flex-1">
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
                "flex-1 h-px",
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
