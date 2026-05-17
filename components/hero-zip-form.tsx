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
    <form onSubmit={onSubmit} noValidate aria-label="Enter your ZIP code" className="flex flex-col gap-3">
      {/* Customer class toggle — only Residential is wired today.
          Commercial is shown as a disabled "coming soon" affordance so
          business visitors know it's on the roadmap without us faking
          a recommendation flow we can't honestly back up yet. */}
      <div role="radiogroup" aria-label="Customer class" className="flex items-center gap-2">
        <span
          role="radio"
          aria-checked="true"
          className="font-mono text-[10px] uppercase tracking-[0.25em] border border-accent text-accent px-3 py-1.5 cursor-default"
        >
          Residential
        </span>
        <span
          role="radio"
          aria-checked="false"
          aria-disabled="true"
          className="font-mono text-[10px] uppercase tracking-[0.25em] border border-foreground/15 text-muted-foreground/70 px-3 py-1.5 cursor-not-allowed select-none"
          title="Business plan support is in development."
        >
          Commercial <span className="ml-1 text-foreground/40">· Coming Soon</span>
        </span>
      </div>

      <div className="flex items-stretch gap-3">
        <label htmlFor="hero-zip-input" className="sr-only">
          ZIP code
        </label>
        <input
          id="hero-zip-input"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="ZIP"
          value={zip}
          onChange={(e) => {
            setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
            if (error) setError(null);
          }}
          aria-invalid={error != null}
          disabled={submitting}
          className="w-32 bg-transparent border border-foreground/20 px-4 py-3.5 font-mono text-sm tracking-widest uppercase text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent transition-colors disabled:opacity-60"
        />
        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={!submitting ? { scale: 1.02 } : undefined}
          whileTap={!submitting ? { scale: 0.98 } : undefined}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className="group inline-flex items-center gap-3 border border-foreground/20 px-7 py-3.5 font-mono text-sm uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors disabled:opacity-60"
        >
          <ScrambleTextOnHover text={submitting ? "Loading…" : "Find My Plan"} as="span" duration={0.6} />
          <BitmapChevron className="transition-transform duration-[400ms] ease-in-out group-hover:rotate-45" />
        </motion.button>
      </div>
      {error && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono text-xs text-destructive"
          role="alert"
        >
          {error}
        </motion.span>
      )}
    </form>
  );
}
