"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { BitmapChevron } from "@/components/bitmap-chevron";
import { ScrambleTextOnHover } from "@/components/scramble-text";

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
  const customerClass = "residential" as const;

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
      const res = await fetch("/api/zip-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip }),
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
    } catch {
      setSubmitting(false);
      setError("Network error. Try again.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Enter your ZIP code"
      className="relative w-full max-w-2xl mx-auto flex flex-col gap-6 border border-foreground/30 focus-within:border-accent/60 bg-background/40 backdrop-blur-[2px] p-9 md:p-12 transition-colors duration-200 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_24px_48px_-32px_rgba(0,0,0,0.18)]"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Get Started
        </span>
        <a
          href="/savings-calculator"
          className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-accent transition-colors"
        >
          See How Much You Can Save →
        </a>
      </div>

      {/* Customer class toggle — only Residential is wired today, but Commercial
          is still selectable so business visitors can express intent. Submitting
          while Commercial is selected surfaces a graceful "in development" notice
          rather than routing into the residential flow. */}
      <div role="radiogroup" aria-label="Customer class" className="grid grid-cols-2 gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={true}
          className="relative text-center font-mono text-[11px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.25em] px-2 sm:px-5 py-2.5 border border-accent text-accent cursor-default"
        >
          Residential
          <span className="ml-1.5 text-[8px] sm:text-[9px] tracking-[0.2em] text-accent align-middle">
            · Beta
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked="false"
          aria-disabled="true"
          disabled
          className="relative text-center font-mono text-[11px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.25em] px-2 sm:px-5 py-2.5 border border-foreground/15 text-muted-foreground/60 cursor-not-allowed select-none"
          title="Commercial plans are in development."
        >
          Commercial
          <span className="ml-1.5 text-[8px] sm:text-[9px] tracking-[0.2em] text-muted-foreground/50 align-middle">
            · Soon
          </span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        <label htmlFor="hero-zip-input" className="sr-only">
          ZIP code
        </label>
        <input
          id="hero-zip-input"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="ENTER ZIP"
          value={zip}
          onChange={(e) => {
            setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
            if (error) setError(null);
          }}
          aria-invalid={error != null}
          disabled={submitting}
          className="flex-1 min-w-0 sm:w-52 sm:flex-none bg-background/60 border border-foreground/25 px-6 py-5 font-mono text-lg tracking-[0.3em] uppercase text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:bg-background transition-colors disabled:opacity-60"
        />
        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={!submitting ? { scale: 1.02 } : undefined}
          whileTap={!submitting ? { scale: 0.98 } : undefined}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className="group inline-flex items-center justify-center gap-3 flex-1 border border-foreground/30 px-8 py-5 font-mono text-base uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors disabled:opacity-60"
        >
          <ScrambleTextOnHover text={submitting ? "Loading…" : "Find My Plan"} as="span" duration={0.6} />
          <BitmapChevron className="transition-transform duration-[400ms] ease-in-out group-hover:rotate-45" />
        </motion.button>
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
