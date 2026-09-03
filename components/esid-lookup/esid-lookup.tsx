"use client";

import { useState, useEffect, useRef } from "react";

// MeterPlan's docs say `matches` is an array<object> with an ESI ID per match
// but don't pin the field names. We render defensively — pick the first
// plausible key for each piece of info.

type Match = Record<string, unknown>;
type Result = {
  query: string;
  matchCount: number;
  matches: Match[];
};

function pick(m: Match, keys: string[]): string | null {
  for (const k of keys) {
    const v = m[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function extract(m: Match) {
  const esiid =
    pick(m, ["esiId", "esi_id", "esiid", "esId", "id"]) ?? "—";

  const formatted = pick(m, ["formattedAddress", "fullAddress", "displayAddress"]);
  const street = pick(m, ["street", "streetAddress", "address", "line1", "addr"]);
  const city = pick(m, ["city", "municipality"]);
  const state = pick(m, ["state", "region"]);
  const zip = pick(m, ["postalCode", "zip", "zipCode", "postal_code"]);

  const utilityRaw = pick(m, ["utility", "tdu", "tdsp", "utilityName", "tduName"]);
  const tdu = utilityRaw && utilityRaw.toLowerCase() !== "unknown" ? utilityRaw : null;

  return { esiid, formatted, street, city, state, zip, tdu };
}

// Lower bound on chars before we start firing lookups. MeterPlan requires
// 4+, but at 4 chars suggestions are too vague to be useful.
const MIN_QUERY_LEN = 5;
const DEBOUNCE_MS = 350;

export function EsidLookup() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Match[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [selected, setSelected] = useState<Match | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced fetch — runs on every query change. Cancels previous timer
  // and any in-flight request so we never display stale results.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setMatchCount(0);
      setLoading(false);
      return;
    }

    // If the user is editing after picking a result, suggestions should
    // reappear and the selected card should clear.
    if (selected) setSelected(null);

    debounceTimer.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/esid-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, maxResults: 8 }),
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => ({}))) as Result | { error?: string };
        if (controller.signal.aborted) return;
        if (!res.ok) {
          setError((data as { error?: string }).error ?? "Lookup failed.");
          setSuggestions([]);
          setMatchCount(0);
          return;
        }
        const r = data as Result;
        setSuggestions(r.matches ?? []);
        setMatchCount(r.matchCount ?? 0);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Network error.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // selected intentionally excluded: we only react to query changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectMatch(m: Match) {
    setSelected(m);
    setOpen(false);
    setSuggestions([]);
  }

  function clearAll() {
    setQuery("");
    setSelected(null);
    setSuggestions([]);
    setMatchCount(0);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-8">
      <div
        ref={containerRef}
        className="relative border border-foreground/30 focus-within:border-accent/60 bg-background/40 backdrop-blur-[2px] p-6 md:p-8 transition-colors duration-200 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_24px_48px_-32px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Address lookup
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
            Powered by MeterPlan
          </span>
        </div>

        <label htmlFor="esid-query" className="sr-only">
          Street address
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id="esid-query"
            type="text"
            placeholder="Start typing an address — e.g. 5500 Greenville Ave, Dallas"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            autoComplete="off"
            className="w-full bg-background/60 border border-foreground/25 px-4 py-3 pr-24 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:bg-background transition-colors"
          />
          {/* Right-side status indicator: spinner while loading, clear button when there's text */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="animate-spin text-accent"
                aria-label="Loading"
              >
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="20 12" />
              </svg>
            )}
            {query && !loading && (
              <button
                type="button"
                onClick={clearAll}
                className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-accent transition-colors"
                aria-label="Clear"
              >
                Clear
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {open && query.trim().length >= MIN_QUERY_LEN && !selected && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-background border border-border/60 shadow-lg max-h-[420px] overflow-y-auto overscroll-contain">
              {suggestions.length === 0 && !loading && !error && (
                <div className="px-4 py-4 font-mono text-xs text-muted-foreground">
                  No matches yet. Try adding a city or 5-digit ZIP.
                </div>
              )}
              {error && (
                <div className="px-4 py-4 font-mono text-xs text-destructive">
                  {error}
                </div>
              )}
              {suggestions.map((m, i) => {
                const r = extract(m);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectMatch(m)}
                    className="w-full text-left px-4 py-3 border-b border-border/30 last:border-b-0 hover:bg-accent/5 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm text-foreground group-hover:text-accent transition-colors truncate">
                          {r.formatted ?? r.street ?? "(no address)"}
                        </div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                          ESI ID {r.esiid}
                        </div>
                      </div>
                      <span
                        aria-hidden="true"
                        className="font-mono text-xs text-muted-foreground group-hover:text-accent transition-colors"
                      >
                        ↵
                      </span>
                    </div>
                  </button>
                );
              })}
              {matchCount > suggestions.length && (
                <div className="px-4 py-2 border-t border-border/30 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 bg-background/60">
                  Showing {suggestions.length} of {matchCount}. Refine the address to narrow.
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
          Type at least {MIN_QUERY_LEN} characters. Suggestions appear as you type.
        </p>
      </div>

      {/* Selected match — large result card */}
      {selected && (() => {
        const r = extract(selected);
        return (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-2xl md:text-3xl tracking-tight leading-none">
                ESI ID FOUND
              </h2>
              <button
                type="button"
                onClick={clearAll}
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors"
              >
                Search again
              </button>
            </div>
            <div className="border border-accent/40 rounded-lg p-6 md:p-8 bg-accent/5">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-3">
                ESI ID
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-3xl sm:text-4xl text-foreground tracking-tight leading-none break-all">
                    {r.esiid}
                  </div>
                  {(r.formatted || r.street) && (
                    <div className="mt-4 font-mono text-sm text-foreground/80 leading-snug">
                      {r.formatted ?? (
                        <>
                          {r.street}
                          {(r.city || r.state || r.zip) && (
                            <span className="text-muted-foreground">
                              {r.city ? `, ${r.city}` : ""}
                              {r.state ? `, ${r.state}` : ""}
                              {r.zip ? ` ${r.zip}` : ""}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {r.tdu && (
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
                      {r.tdu}
                    </div>
                  )}
                </div>
                <CopyButton value={r.esiid} />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function onClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silent — user can highlight + copy manually
    }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 self-start font-mono text-[10px] uppercase tracking-[0.3em] border border-accent/60 px-4 py-2 text-accent hover:bg-accent hover:text-background transition-colors"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
