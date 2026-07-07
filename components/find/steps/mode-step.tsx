"use client";

import { motion } from "framer-motion";
import { Gauge, Lightbulb, SlidersHorizontal, type LucideIcon } from "lucide-react";
import type { Mode } from "@/components/find/wizard-types";
import { SectionLabel } from "@/components/ui/section-label";

type Path = {
  mode: Mode;
  index: string;
  tag: string;
  title: string;
  blurb: string;
  specs: string[];
  time: string;
  Icon: LucideIcon;
  recommended?: boolean;
};

const PATHS: Path[] = [
  {
    mode: "smart",
    index: "01",
    tag: "Recommended",
    title: "Smart Match",
    blurb: "Answer a few questions, then dial in what matters to you. We rank plans against your priorities.",
    specs: ["Weighted scoring across 7 factors", "Sees beyond headline rates"],
    time: "~30 sec",
    Icon: Lightbulb,
    recommended: true,
  },
  {
    mode: "basic",
    index: "02",
    tag: "Fast Lane",
    title: "Basic Filters",
    blurb: "Skip the questions. Pick rate type, term length, and a green-energy minimum — we show what fits.",
    specs: ["Direct checkbox filters", "No weights or sliders"],
    time: "~10 sec",
    Icon: SlidersHorizontal,
  },
  {
    mode: "meter",
    index: "03",
    tag: "Bring Your Data",
    title: "Meter Upload",
    blurb: "Drop in your Smart Meter Texas CSV and we rank plans against your real usage, not a guess.",
    specs: ["Up to 13 months of readings", "No more estimating kWh"],
    time: "~15 sec",
    Icon: Gauge,
  },
];

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
};

const col = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

export function ModeStep({ onSelect }: { onSelect: (mode: Mode) => void }) {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
          <SectionLabel>Choose your method</SectionLabel>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Select one / 3
          </span>
        </div>
        <h2 className="mt-5 font-[family-name:var(--font-bebas)] text-foreground text-[clamp(2.75rem,7vw,5rem)] leading-[0.9] tracking-tight">
          PICK YOUR <span className="text-accent">PATH.</span>
        </h2>
        <p className="mt-3 max-w-md font-mono text-sm text-muted-foreground leading-relaxed">
          Three routes to the same finish — the right electricity plan for your address.
        </p>
      </div>

      {/* Three vertical columns */}
      <motion.div
        variants={list}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3"
      >
        {PATHS.map((p) => (
          <motion.div key={p.mode} variants={col} className="flex">
            <PathColumn path={p} onClick={() => onSelect(p.mode)} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function PathColumn({ path, onClick }: { path: Path; onClick: () => void }) {
  const { index, tag, title, blurb, specs, time, Icon, recommended } = path;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full flex-col border border-border bg-card/30 text-left shadow-e1 transition-all duration-300 hover:border-accent hover:bg-accent-soft/25 hover:shadow-e3"
    >
      {/* Top accent rule — reveals on hover */}
      <span
        aria-hidden="true"
        className="h-[3px] w-full origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100"
      />

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        {/* Number + tag */}
        <div className="flex items-start justify-between gap-3">
          <span className="font-[family-name:var(--font-bebas)] text-[5rem] leading-[0.8] tracking-tight text-foreground/15 transition-colors duration-300 group-hover:text-accent sm:text-[5.5rem]">
            {index}
          </span>
          {recommended ? (
            <span className="mt-2 shrink-0 bg-accent px-2 py-1 font-mono text-[8px] uppercase tracking-[0.2em] text-accent-foreground">
              {tag}
            </span>
          ) : (
            <span className="mt-3 text-right font-mono text-[9px] uppercase leading-[1.6] tracking-[0.28em] text-accent">
              {tag}
            </span>
          )}
        </div>

        {/* Icon + title */}
        <div className="mt-5 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-border text-accent transition-colors duration-200 group-hover:border-accent group-hover:bg-accent-soft/50"
          >
            <Icon size={18} strokeWidth={1.75} />
          </span>
          <h3 className="font-[family-name:var(--font-bebas)] text-[1.7rem] leading-none tracking-tight text-foreground transition-colors duration-200 group-hover:text-accent">
            {title}
          </h3>
        </div>

        {/* Blurb */}
        <p className="mt-3 font-mono text-sm leading-relaxed text-muted-foreground">{blurb}</p>

        {/* Specs */}
        <ul className="mt-5 flex-1 space-y-2.5">
          {specs.map((s) => (
            <li key={s} className="flex items-start gap-2.5 font-mono text-xs leading-relaxed text-foreground/70">
              <span aria-hidden="true" className="mt-[2px] shrink-0 text-accent">
                —
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="mt-7 flex items-center justify-between border-t border-border/60 pt-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] tabular-nums text-muted-foreground">
            {time}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-all duration-200 group-hover:-translate-y-[1px] group-hover:border-accent group-hover:bg-accent-soft/50 group-hover:text-accent">
            Select
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </span>
        </div>
      </div>
    </button>
  );
}
