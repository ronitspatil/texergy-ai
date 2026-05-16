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
        className="border border-foreground bg-foreground text-background px-7 py-3 font-mono text-sm uppercase tracking-widest hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {nextLabel}
      </button>
    </div>
  );
}
