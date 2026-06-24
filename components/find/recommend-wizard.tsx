"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ProgressBar } from "@/components/find/progress-bar";
import { ColophonSection } from "@/components/colophon-section";
import { ModeStep } from "@/components/find/steps/mode-step";
import { QuestionsStep } from "@/components/find/steps/questions-step";
import { WeightsStep } from "@/components/find/steps/weights-step";
import { ResultsStep } from "@/components/find/steps/results-step";
import { UploadStep } from "@/components/find/steps/upload-step";
import type { Mode, WizardState } from "@/components/find/wizard-types";

const STEPS_SMART = ["MODE", "PROFILE", "WEIGHTS", "MATCH"] as const;
const STEPS_BASIC = ["MODE", "PROFILE", "MATCH"] as const;
const STEPS_METER = ["MODE", "UPLOAD", "MATCH"] as const;

export function RecommendWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const zipFromUrl = params.get("zip") ?? "";

  // If someone lands here without a valid ZIP, kick them back to /find.
  useEffect(() => {
    if (!/^\d{5}$/.test(zipFromUrl)) router.replace("/");
  }, [zipFromUrl, router]);

  const [state, setState] = useState<WizardState>(() => ({
    zip: zipFromUrl,
    mode: null,
    monthlyUsageKwh: 1000,
    usageEstimate: null,
    rateTypePref: "any",
    renewablePref: "any",
    termPref: "any",
    timeOfUsePref: "any",
    baseChargePref: "any",
    etfPref: "any",
    devices: [],
    providerIds: [],
    sortBy: "score",
    weights: {
      cost: 35,
      renewable: 10,
      contractFlexibility: 10,
      rateStability: 15,
      billTransparency: 10,
      historicalPricing: 10,
      weatherForecast: 10,
    },
    stepIndex: 0,
  }));

  const steps =
    state.mode === "basic" ? STEPS_BASIC : state.mode === "meter" ? STEPS_METER : STEPS_SMART;
  const currentStep = steps[state.stepIndex] ?? steps[0];

  function setMode(mode: Mode) {
    setState((s) => ({ ...s, mode, stepIndex: 1 }));
  }
  function goNext() {
    setState((s) => ({ ...s, stepIndex: Math.min(s.stepIndex + 1, steps.length - 1) }));
  }
  function goBack() {
    setState((s) => ({ ...s, stepIndex: Math.max(0, s.stepIndex - 1) }));
  }

  const progress = useMemo(
    () => steps.map((label, idx) => ({ label, active: idx === state.stepIndex, done: idx < state.stepIndex })),
    [steps, state.stepIndex],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number, o?: { immediate?: boolean }) => void } }).__lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo({ top: 0, behavior: "auto" });
  }, [state.stepIndex]);

  if (!/^\d{5}$/.test(zipFromUrl)) return null;

  return (
    <div className="relative min-h-screen">
      <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

      <header className="fixed inset-x-0 top-0 z-30 border-b border-border/50 bg-background/90 px-4 py-3.5 sm:px-6 sm:py-4 md:px-12 backdrop-blur-md">
        {/* Mobile: back + ZIP share a justify-between row with the bar stacked
            below (no room for all three inline). Desktop: `sm:contents`
            flattens that wrapper so back / bar / ZIP sit on one aligned row,
            ordered via the per-child sm:order utilities. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center justify-between gap-3 sm:contents">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="shrink-0 font-mono text-xs uppercase tracking-normal text-muted-foreground hover:text-foreground transition-colors sm:order-1"
            >
              ← Texergy AI
            </button>
            <div className="shrink-0 font-mono text-xs text-muted-foreground sm:order-3">
              ZIP <span className="text-foreground">{state.zip}</span>
            </div>
          </div>
          <div className="min-w-0 sm:order-2 sm:flex-1">
            <ProgressBar steps={progress} />
          </div>
        </div>
      </header>

      <div className="relative z-10 px-3 pb-12 pt-28 sm:px-6 sm:pt-[124px] md:px-12">
        {/* The key prop on motion.div forces a fresh mount on every step
            change, which lets each step play its enter animation. We drop
            AnimatePresence + exit animations because the mode="wait" pattern
            stalls under framer-motion 12 + React 19 in this app. The enter-
            only animation still reads as a smooth transition. */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          {currentStep === "MODE" && <ModeStep onSelect={setMode} />}

          {currentStep === "UPLOAD" && (
            <UploadStep
              monthlyUsageKwh={state.monthlyUsageKwh}
              onParsed={(kwh) => setState((s) => ({ ...s, monthlyUsageKwh: kwh }))}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {currentStep === "PROFILE" && (
            <QuestionsStep
              state={state}
              onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {currentStep === "WEIGHTS" && (
            <WeightsStep
              weights={state.weights}
              onChange={(weights) => setState((s) => ({ ...s, weights }))}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {currentStep === "MATCH" && (
            <ResultsStep
              state={state}
              onUpdate={(patch) => setState((s) => ({ ...s, ...patch }))}
              onBack={goBack}
            />
          )}
        </motion.div>
      </div>

      {currentStep === "MATCH" && <ColophonSection />}
    </div>
  );
}
