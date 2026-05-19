"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ProgressBar } from "@/components/find/progress-bar";
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
      cost: 40,
      renewable: 10,
      contractFlexibility: 15,
      rateStability: 15,
      ratings: 10,
      historicalPricing: 10,
      weatherForecast: 0,
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

  if (!/^\d{5}$/.test(zipFromUrl)) return null;

  return (
    <div className="relative min-h-screen">
      <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

      <header className="fixed inset-x-0 top-0 z-30 border-b border-border/50 bg-background/90 px-6 py-6 backdrop-blur-md md:px-12">
        <div className="flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Texergy AI
          </button>
          <div className="font-mono text-xs text-muted-foreground">
            ZIP <span className="text-foreground">{state.zip}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Back to Texergy AI home"
          className="absolute left-1/2 top-4 inline-flex size-10 -translate-x-1/2 items-center justify-center transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
            <img
              src="/logo.svg"
              alt="Texergy AI"
              className="size-[25px]"
            />
          </span>
        </button>
        <div className="mt-6">
          <ProgressBar steps={progress} />
        </div>
      </header>

      <div className="relative z-10 px-6 pb-12 pt-[152px] md:px-12">
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
    </div>
  );
}
