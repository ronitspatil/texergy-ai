"use client";

// Lookup widget: ZIP → TDU. POSTs to /api/utility-for-zip which tries the
// MeterPlan upstream first, then falls back to our Supabase cache. The UI
// stays useful in all three branches: resolved, not-resolved (out of the
// deregulated market), or no-answer (both upstreams missed).

import { useState } from "react";

type LookupResult = {
  zipCode?: string;
  utilityCode?: string | null;
  utilityDisplayName?: string | null;
  utilityShortName?: string | null;
  isDeregulated?: boolean;
  eligibilityLikelihood?: number;
  resolved?: boolean;
  source: "meter_api" | "supabase_cache" | "none";
};

export function TduLookup() {
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a 5-digit ZIP.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/utility-for-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip }),
      });
      const body = (await res.json().catch(() => ({}))) as LookupResult & { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="tdu-lookup-heading"
      className="border border-border/60 bg-card/40 p-6 md:p-8 mb-16"
    >
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          Tool
        </span>
        <span aria-hidden="true" className="flex-1 h-px bg-border/40 max-w-[120px]" />
      </div>
      <h2
        id="tdu-lookup-heading"
        className="font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight leading-none"
      >
        FIND YOUR TDU.
      </h2>
      <p className="mt-3 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
        Drop a Texas ZIP to see which Transmission &amp; Distribution Utility
        owns the wires at that address. Determines which retail plans you
        can pick from.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-stretch"
      >
        <label htmlFor="tdu-zip" className="sr-only">
          Texas ZIP code
        </label>
        <input
          id="tdu-zip"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="75201"
          value={zip}
          onChange={(e) => {
            setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
            if (error) setError(null);
          }}
          className="flex-1 sm:max-w-[180px] bg-background border border-border/70 px-4 py-3 font-mono text-lg tabular-nums tracking-widest text-foreground focus:outline-none focus:border-accent placeholder:text-muted-foreground/40 ph-no-capture"
        />
        <button
          type="submit"
          disabled={loading || !/^\d{5}$/.test(zip)}
          className="border border-foreground bg-foreground text-background px-6 py-3 font-mono text-xs uppercase tracking-widest hover:bg-accent hover:border-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-foreground disabled:hover:border-foreground"
        >
          {loading ? "Looking up…" : "Look up TDU"}
        </button>
      </form>

      {error && (
        <p className="mt-4 font-mono text-xs text-destructive">{error}</p>
      )}

      {result && !error && <Result result={result} />}
    </section>
  );
}

function Result({ result }: { result: LookupResult }) {
  // Three rendering branches:
  //   1. Resolved + deregulated → big TDU name + supporting facts
  //   2. Resolved + NOT deregulated → "Out of deregulated market"
  //   3. Not resolved → "We couldn't determine the TDU"
  if (!result.resolved || !result.utilityCode) {
    return (
      <div className="mt-6 border-l-2 border-muted-foreground/40 pl-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          ZIP {result.zipCode}
        </div>
        <p className="mt-2 font-mono text-sm text-foreground/80 leading-relaxed">
          We couldn&apos;t resolve a Texas TDU for this ZIP. It may be outside
          the ERCOT footprint, a brand-new development, or temporarily
          unavailable upstream.
        </p>
      </div>
    );
  }

  if (!result.isDeregulated) {
    return (
      <div className="mt-6 border-l-2 border-muted-foreground/60 pl-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          ZIP {result.zipCode}
        </div>
        <div className="mt-2 font-[var(--font-bebas)] text-2xl md:text-3xl tracking-tight text-foreground leading-none">
          {(result.utilityDisplayName ?? result.utilityCode).toUpperCase()}
        </div>
        <p className="mt-3 max-w-xl font-mono text-sm text-foreground/80 leading-relaxed">
          This ZIP is in a regulated utility territory (municipal or co-op).
          You don&apos;t get to choose your retail provider here, so Texergy
          can&apos;t compare plans for this address.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 border-l-2 border-accent pl-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          ZIP {result.zipCode}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {result.utilityCode}
        </div>
        {result.source === "supabase_cache" && (
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
            local cache
          </div>
        )}
      </div>
      <div className="mt-2 font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight text-foreground leading-none">
        {(result.utilityDisplayName ?? result.utilityShortName ?? result.utilityCode).toUpperCase()}
      </div>
      <p className="mt-3 max-w-xl font-mono text-sm text-foreground/80 leading-relaxed">
        Your TDU owns the wires to your home. The energy itself comes from
        whichever retail provider you pick — and Texergy compares every plan
        available in {result.utilityShortName ?? result.utilityCode}&apos;s
        footprint.
      </p>
      <a
        href={`/find/recommend?zip=${result.zipCode}`}
        className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground hover:text-accent transition-colors"
      >
        <span>See plans for {result.zipCode}</span>
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
