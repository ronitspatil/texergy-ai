"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type {
  BaseChargePref,
  EtfPref,
  RateTypePref,
  RenewablePref,
  TermPref,
  TimeOfUsePref,
  WeightsUI,
  WizardState,
} from "@/components/find/wizard-types";

/** Editable preference panel that lives next to the results. Every change
 *  triggers a re-fetch upstream (because results-step.tsx watches inputKey).
 *  Smart-mode users see weight sliders; basic-mode users only see filters. */
export function ResultsSidebar({
  state,
  onUpdate,
}: {
  state: WizardState;
  onUpdate: (patch: Partial<WizardState>) => void;
}) {
  const isSmart = state.mode === "smart";

  return (
    <div className="space-y-8">
      <Block label="Usage">
        <input
          type="number"
          min={50}
          max={20000}
          step={50}
          value={state.monthlyUsageKwh}
          onChange={(e) =>
            onUpdate({
              monthlyUsageKwh: Math.max(50, Math.min(20000, parseInt(e.target.value || "0", 10) || 0)),
            })
          }
          className="w-full bg-transparent border border-foreground/25 px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
        />
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          kWh / mo
        </div>
      </Block>

      <Block label="Provider">
        <ProviderMultiSelect
          selectedIds={state.providerIds}
          onChange={(ids) => onUpdate({ providerIds: ids })}
        />
      </Block>

      <Block label="Rate type">
        <Chips
          value={state.rateTypePref}
          options={[
            { value: "any", label: "Any" },
            { value: "Fixed", label: "Fixed" },
            { value: "Variable", label: "Var" },
          ]}
          onChange={(v) => onUpdate({ rateTypePref: v as RateTypePref })}
        />
      </Block>

      <Block label="Renewable">
        <Chips
          value={state.renewablePref}
          options={[
            { value: "any", label: "Any" },
            { value: "atleast25", label: "25%+" },
            { value: "atleast50", label: "50%+" },
            { value: "atleast90", label: "90%+" },
            { value: "only100", label: "100" },
          ]}
          onChange={(v) => onUpdate({ renewablePref: v as RenewablePref })}
        />
      </Block>

      <Block label="Term">
        <Chips
          value={state.termPref}
          options={[
            { value: "any", label: "Any" },
            { value: "monthToMonth", label: "M2M" },
            { value: "short", label: "≤6" },
            { value: "medium", label: "12" },
            { value: "long", label: "24+" },
          ]}
          onChange={(v) => onUpdate({ termPref: v as TermPref })}
        />
      </Block>

      <Block label="Time of use">
        <Chips
          value={state.timeOfUsePref}
          options={[
            { value: "any", label: "Any" },
            { value: "only", label: "ToU only" },
            { value: "none", label: "No ToU" },
          ]}
          onChange={(v) => onUpdate({ timeOfUsePref: v as TimeOfUsePref })}
        />
      </Block>

      <Block label="Base charge">
        <Chips
          value={state.baseChargePref}
          options={[
            { value: "any", label: "Any" },
            { value: "zero", label: "$0" },
            { value: "atmost5", label: "≤$5" },
            { value: "atmost10", label: "≤$10" },
          ]}
          onChange={(v) => onUpdate({ baseChargePref: v as BaseChargePref })}
        />
      </Block>

      <Block label="ETF">
        <Chips
          value={state.etfPref}
          options={[
            { value: "any", label: "Any" },
            { value: "none", label: "None" },
            { value: "atmost100", label: "≤$100" },
            { value: "atmost200", label: "≤$200" },
          ]}
          onChange={(v) => onUpdate({ etfPref: v as EtfPref })}
        />
      </Block>

      {isSmart && (
        <EditWeightsButton
          weights={state.weights}
          onChange={(weights) => onUpdate({ weights })}
        />
      )}
    </div>
  );
}

function EditWeightsButton({
  weights,
  onChange,
}: {
  weights: WeightsUI;
  onChange: (w: WeightsUI) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WeightsUI>(weights);

  function openDialog() {
    setDraft(weights);
    setOpen(true);
  }
  function save() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="w-full border border-foreground/25 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-foreground hover:border-accent hover:text-accent transition-colors"
      >
        Edit weights →
      </button>
      {/* Portal renders the dialog at document.body so it isn't clipped by any
          ancestor CSS transform (framer-motion's y-animation on the wizard
          step breaks position:fixed when the dialog is a descendant). */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <EditWeightsDialog
                draft={draft}
                onDraftChange={setDraft}
                onCancel={() => setOpen(false)}
                onSave={save}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function EditWeightsDialog({
  draft,
  onDraftChange,
  onCancel,
  onSave,
}: {
  draft: WeightsUI;
  onDraftChange: (w: WeightsUI) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    const scrollY = window.scrollY;
    const prev = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev.htmlOverflow;
      document.body.style.position = prev.bodyPosition;
      document.body.style.top = prev.bodyTop;
      document.body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [onCancel]);

  return (
    <motion.div
      key="edit-weights-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto"
      data-lenis-prevent="true"
      role="dialog"
      aria-modal="true"
      aria-label="Edit ranking weights"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen flex items-center justify-center px-4 py-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-lg border border-border bg-background p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                Tune the ranker
              </div>
              <h2 className="mt-2 font-[var(--font-bebas)] text-3xl tracking-tight leading-none">
                EDIT WEIGHTS.
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="border border-foreground/25 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <WeightSliders weights={draft} onChange={onDraftChange} />
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="border border-foreground bg-foreground text-background px-5 py-2 font-mono text-xs uppercase tracking-widest hover:bg-accent hover:border-accent transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-3">{label}</div>
      {children}
    </div>
  );
}


function Chips({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
            value === o.value
              ? "border-accent text-accent"
              : "border-foreground/20 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Multi-select dropdown of REPs that have at least one active plan. Fetches
 *  the list once on mount from /api/providers. Click-outside closes the panel. */
function ProviderMultiSelect({
  selectedIds,
  onChange,
}: {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [providers, setProviders] = useState<{ id: number; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/providers")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setProviders(Array.isArray(data.providers) ? data.providers : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedSet = new Set(selectedIds);
  const filtered = query.trim()
    ? providers.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : providers;

  function toggle(id: number) {
    const next = selectedSet.has(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
  }

  const label =
    selectedIds.length === 0
      ? "All providers"
      : selectedIds.length === 1
        ? providers.find((p) => p.id === selectedIds[0])?.name ?? "1 selected"
        : `${selectedIds.length} selected`;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between border border-foreground/25 px-3 py-2 font-mono text-xs text-foreground hover:border-accent transition-colors"
      >
        <span className="truncate text-left">{label}</span>
        <span className={`ml-2 text-accent transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div
          data-lenis-prevent="true"
          className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto overscroll-contain border border-foreground/25 bg-background shadow-lg"
        >
          <div className="sticky top-0 bg-background border-b border-border/40 p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-transparent border border-foreground/20 px-2 py-1 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent"
            />
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors"
              >
                Clear ({selectedIds.length})
              </button>
            )}
          </div>
          <ul className="divide-y divide-border/30">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 font-mono text-[11px] text-muted-foreground">No matches.</li>
            ) : (
              filtered.map((p) => {
                const checked = selectedSet.has(p.id);
                return (
                  <li key={p.id}>
                    <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(p.id)}
                        className="accent-accent shrink-0"
                      />
                      <span className="font-mono text-[11px] text-foreground truncate">{p.name}</span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const SLIDER_FACTORS: { key: keyof WeightsUI; label: string }[] = [
  { key: "cost", label: "Cost" },
  { key: "renewable", label: "Renew" },
  { key: "contractFlexibility", label: "Flex" },
  { key: "rateStability", label: "Rate pref" },
  { key: "historicalPricing", label: "History" },
  { key: "weatherForecast", label: "Weather" },
  { key: "billTransparency", label: "Transparency" },
];

function WeightSliders({
  weights,
  onChange,
}: {
  weights: WeightsUI;
  onChange: (w: WeightsUI) => void;
}) {
  return (
    <div className="space-y-3">
      {SLIDER_FACTORS.map((f) => (
        <div key={f.key}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/80">{f.label}</span>
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{weights[f.key]}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={weights[f.key]}
            onChange={(e) => onChange({ ...weights, [f.key]: parseInt(e.target.value, 10) })}
            className="w-full accent-accent"
          />
        </div>
      ))}
    </div>
  );
}
