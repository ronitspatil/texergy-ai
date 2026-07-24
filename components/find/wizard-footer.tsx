"use client";

export function WizardFooter({
  onBack,
  onNext,
  backLabel = "← Back",
  nextLabel = "Next →",
  nextDisabled = false,
}: {
  onBack: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-16 pt-8 border-t border-border/40 flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
      >
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="grain-surface rounded-full bg-accent text-accent-foreground shadow-e1 px-8 py-3 font-mono text-sm uppercase tracking-widest hover:bg-accent-strong hover:shadow-e2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {nextLabel}
      </button>
    </div>
  );
}
