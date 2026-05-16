"use client";

import type { Mode } from "@/components/find/wizard-types";
import { SectionLabel } from "@/components/ui/section-label";

export function ModeStep({ onSelect }: { onSelect: (mode: Mode) => void }) {
  return (
    <div className="max-w-4xl mx-auto">
      <SectionLabel className="block mb-4">Choose how to find your plan</SectionLabel>
      <h2 className="font-[family-name:var(--font-bebas)] text-foreground text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-tight mb-12">
        SMART, OR <span className="text-accent">SIMPLE.</span>
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        <ModeCard
          onClick={() => onSelect("smart")}
          tag="01 / Recommended"
          title="Smart Match"
          blurb="Answer a few questions, then dial in what matters to you — cost vs. renewables vs. flexibility. We'll rank plans against your priorities."
          bullets={["Weighted scoring across 5 factors", "Sees beyond headline rates", "~30 seconds"]}
        />
        <ModeCard
          onClick={() => onSelect("basic")}
          tag="02 / Fast lane"
          title="Basic Filters"
          blurb="Skip the questions. Just pick the rate type, term length, and minimum green energy you want, and we'll show what fits."
          bullets={["Direct checkbox filters", "No weights, no scoring slider", "~10 seconds"]}
        />
      </div>
    </div>
  );
}

function ModeCard({
  onClick,
  tag,
  title,
  blurb,
  bullets,
}: {
  onClick: () => void;
  tag: string;
  title: string;
  blurb: string;
  bullets: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left border border-border bg-card p-8 hover:border-accent hover:bg-card/80 transition-colors flex flex-col h-full"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-6">
        {tag}
      </div>
      <h3 className="font-[family-name:var(--font-bebas)] text-foreground text-4xl tracking-tight mb-3 group-hover:text-accent transition-colors">
        {title}
      </h3>
      {/* min-height holds the blurb area to 4 lines so cards of different blurb
          lengths still line up their bullet lists vertically. */}
      <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-6 min-h-[6.5rem]">
        {blurb}
      </p>
      <ul className="space-y-2 mt-auto">
        {bullets.map((b) => (
          <li key={b} className="font-mono text-xs text-foreground/80 flex gap-3">
            <span className="text-accent">→</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
