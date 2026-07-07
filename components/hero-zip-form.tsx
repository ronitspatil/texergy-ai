"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

/** ZIP entry that replaces the "Join Waitlist" CTA on the hero when the site
 *  is built in product mode. Submitting takes the user straight into the
 *  recommendation wizard with the ZIP pre-filled. Styling intentionally
 *  mirrors the original CTA so the hero composition doesn't shift. */
export function HeroZipForm() {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Customer class is residential-only today. Commercial is shown as a
  // disabled "Soon" affordance so business visitors see it's on the roadmap.
  const customerClass: "residential" | "commercial" = "residential";
  // Shorter placeholder on phones where the field is narrower.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (!/^\d{5}$/.test(zip)) {
      setError("Please enter a 5-digit ZIP.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      // Hard cap so the button can never get wedged on "Loading…" if the
      // endpoint stalls — the server bounds its own external calls, but this
      // guards against anything in between (cold start, proxy, lost network).
      const res = await fetch("/api/zip-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip }),
        signal: AbortSignal.timeout(15000),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reason?: string;
        tduCodes?: string[];
      };
      if (!res.ok || !data.ok) {
        setSubmitting(false);
        if (data.reason === "not_deregulated") {
          setError(
            `ZIP ${zip} isn't in a deregulated area. Texergy AI only works for ZIPs served by ERCOT retail providers.`,
          );
        } else if (data.reason === "ptc_unreachable" || data.reason === "ptc_error") {
          setError("Power-to-Choose is temporarily unreachable. Try again in a moment.");
        } else {
          setError("That ZIP doesn't look valid. Double-check the 5 digits.");
        }
        return;
      }
      router.push(`/find/recommend?zip=${zip}`);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof DOMException && err.name === "TimeoutError") {
        setError("This is taking longer than expected. Try again in a moment.");
      } else {
        setError("Network error. Try again.");
      }
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Enter your ZIP code"
      className="relative w-full max-w-2xl mx-auto flex flex-col gap-[clamp(0.875rem,2.2svh,1.5rem)] rounded-xl border border-border/50 focus-within:border-accent/50 bg-background/25 backdrop-blur-sm shadow-e2 focus-within:shadow-e3 p-[clamp(1.5rem,3svh,1.75rem)] sm:p-[clamp(1.75rem,3.5svh,2.25rem)] md:p-[clamp(1.75rem,4svh,3rem)] transition-all duration-200"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="whitespace-nowrap font-mono text-xs sm:text-sm tracking-[0.02em] sm:tracking-[0.06em] text-muted-foreground">
          Get Started
        </span>
        <a
          href="/savings-calculator"
          className="group/calc inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-xs sm:text-sm tracking-[0.02em] sm:tracking-[0.06em] text-muted-foreground hover:text-accent transition-colors"
        >
          Savings Calculator
          <span aria-hidden className="transition-transform duration-200 group-hover/calc:translate-x-0.5">→</span>
        </a>
      </div>

      {/* Customer class — a connected segmented toggle. Residential is the only
          live option today, so the sliding thumb rests on it; Commercial is a
          muted, non-interactive "Soon" affordance. The thumb animates by index,
          so enabling Commercial later is just a state flip. */}
      <div
        role="radiogroup"
        aria-label="Customer class"
        className="relative grid grid-cols-2 rounded-[10px] border border-foreground/20 bg-background/50 p-[3px]"
      >
        {/* Sliding thumb behind the active segment. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] w-[calc(50%-3px)] rounded-[7px] bg-muted-foreground shadow-e1"
          initial={false}
          animate={{ x: customerClass === "residential" ? "0%" : "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
        <button
          type="button"
          role="radio"
          aria-checked={true}
          className="relative z-10 flex items-center justify-center whitespace-nowrap font-mono text-[10px] sm:text-xs tracking-[0.02em] sm:tracking-[0.06em] px-2 sm:px-5 py-2.5 text-background cursor-default"
        >
          Residential
          <span className="ml-1.5 text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-background/70 align-middle">
            · Beta
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked="false"
          aria-disabled="true"
          disabled
          className="relative z-10 flex items-center justify-center whitespace-nowrap font-mono text-[10px] sm:text-xs tracking-[0.02em] sm:tracking-[0.06em] px-2 sm:px-5 py-2.5 text-muted-foreground/50 cursor-not-allowed select-none"
          title="Commercial plans are in development."
        >
          Commercial
          <span className="ml-1.5 text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40 align-middle">
            · Soon
          </span>
        </button>
      </div>

      <div className="flex items-stretch overflow-hidden rounded-full border border-foreground/25 bg-background focus-within:border-accent transition-colors duration-200">
        <label htmlFor="hero-zip-input" className="sr-only">
          ZIP code
        </label>
        <div className="flex flex-1 min-w-0 items-center gap-2.5 pl-5 pr-3 sm:pl-6">
          <MapPin aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground/50" strokeWidth={1.75} />
          <input
            id="hero-zip-input"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            placeholder={isMobile ? "Zip" : "Zip Code"}
            value={zip}
            onChange={(e) => {
              setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
              if (error) setError(null);
            }}
            aria-invalid={error != null}
            disabled={submitting}
            className="flex-1 min-w-0 bg-transparent py-4 sm:py-[clamp(1rem,2.2svh,1.25rem)] font-mono text-sm sm:text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="group grain-surface inline-flex flex-1 items-center justify-center gap-2.5 overflow-hidden rounded-l-full bg-accent shadow-e1 px-4 sm:px-6 font-mono font-bold text-sm sm:text-base tracking-wide text-accent-foreground transition duration-200 hover:bg-accent-strong disabled:opacity-60"
        >
          <span className="whitespace-nowrap">{submitting ? "Loading…" : isMobile ? "See Plans" : "Compare Plans"}</span>
          {!submitting && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="hidden sm:block"
            >
              <path
                d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
      <div className="min-h-[1.25rem] -mt-2" aria-live="polite">
        {error && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block font-mono text-xs text-destructive leading-relaxed"
            role="alert"
          >
            {error}
          </motion.span>
        )}
      </div>
    </form>
  );
}
