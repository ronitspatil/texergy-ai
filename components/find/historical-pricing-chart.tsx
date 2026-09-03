"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  PriceHistoryResponse,
  PriceHistorySeries,
} from "@/app/api/price-history/route";

// The three usage tiers we snapshot, each rendered as its own line. `key` is
// the field on a snapshot point; `color` falls back to a fixed tone when the
// theme accent can't be resolved (the 1,000 kWh line uses the live accent).
type TierKey = "avg500" | "avg1000" | "avg2000";
const TIERS: { key: TierKey; label: string; color: string }[] = [
  { key: "avg500", label: "500 kWh", color: "#3f5a6b" },
  { key: "avg1000", label: "1,000 kWh", color: "#c2622d" },
  { key: "avg2000", label: "2,000 kWh", color: "#6f7a3a" },
];

// Re-poll so the graph reflects the nightly snapshot without a manual reload.
// The data only changes once a day, but a modest poll keeps a long-lived tab
// (or a tab left open across the 08:30 UTC job) current.
const REFRESH_MS = 5 * 60 * 1000;

// Human-readable TDU names. Codes come straight from the `tdus` table.
const TDU_LABELS: Record<string, string> = {
  ONCOR: "Oncor",
  CENTERPOINT: "CenterPoint",
  AEP_CENTRAL: "AEP Central",
  AEP_NORTH: "AEP North",
  TNMP: "TNMP",
};

function tduLabel(code: string): string {
  return (
    TDU_LABELS[code] ??
    code
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ")
  );
}

function formatDate(iso: string): string {
  // iso is YYYY-MM-DD; render the axis tick as numeric month/day, e.g. "6/23".
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function formatDateLong(iso: string): string {
  // Tooltip label keeps the year (data can span the turn of a year), e.g.
  // "6/23/25".
  const [y, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}/${y.slice(2)}`;
}

/** Resolve the theme accent so the 1,000 kWh line matches the rest of the UI.
 *  Falls back to the hardcoded tier color until the CSS var is readable. */
function useAccentColor(fallback: string): string {
  const [accent, setAccent] = useState(fallback);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cs = getComputedStyle(document.documentElement);
    const v = cs.getPropertyValue("--accent").trim();
    if (v) setAccent(v);
  }, []);
  return accent;
}

/** Live historical-pricing graph for the TDU(s) serving the entered ZIP. Plots
 *  the daily average ¢/kWh at 500 / 1,000 / 2,000 kWh as three lines, from
 *  `plan_price_snapshots`. When more than one TDU serves the ZIP, a selector
 *  picks which utility's three lines are shown so the chart stays readable. */
export function HistoricalPricingChart({ tduCodes }: { tduCodes: string[] }) {
  const [series, setSeries] = useState<PriceHistorySeries[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTdu, setActiveTdu] = useState<string | null>(null);
  const accent = useAccentColor("#c2622d");
  const abortRef = useRef<AbortController | null>(null);

  // Stable key so the fetch callback only changes when the actual set of TDUs
  // changes, not on every parent re-render.
  const codesKey = useMemo(
    () => [...tduCodes].map((c) => c.toUpperCase()).sort().join(","),
    [tduCodes],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const codes = codesKey ? codesKey.split(",") : [];
      if (codes.length === 0) {
        setSeries([]);
        setLoading(false);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!opts?.silent) setLoading(true);
      try {
        const res = await fetch("/api/price-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tduCodes: codes }),
          signal: controller.signal,
        });
        const body = (await res.json().catch(() => ({}))) as PriceHistoryResponse & {
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        setSeries(body.series ?? []);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        // A failed silent refresh leaves the existing graph in place.
        if (!opts?.silent) {
          setError(err instanceof Error ? err.message : "Could not load price history.");
          setSeries(null);
        }
      } finally {
        if (abortRef.current === controller && !opts?.silent) setLoading(false);
      }
    },
    [codesKey],
  );

  useEffect(() => {
    load();
    const id = setInterval(() => load({ silent: true }), REFRESH_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [load]);

  // Which TDU's lines to show. Defaults to the first returned series and
  // self-heals if the active pick disappears (e.g. ZIP/TDU set changed).
  const selectedTdu = useMemo(() => {
    if (!series || series.length === 0) return null;
    if (activeTdu && series.some((s) => s.code === activeTdu)) return activeTdu;
    return series[0].code;
  }, [series, activeTdu]);

  // Pivot the selected TDU's points into recharts rows keyed by date, one
  // column per usage tier: [{ date, avg500, avg1000, avg2000 }, …]
  const { rows, hasData } = useMemo(() => {
    const s = series?.find((x) => x.code === selectedTdu);
    if (!s) return { rows: [], hasData: false };
    const sorted = [...s.points]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({
        date: p.date,
        avg500: p.avg500,
        avg1000: p.avg1000,
        avg2000: p.avg2000,
      }));
    const anyValue = sorted.some(
      (r) => r.avg500 != null || r.avg1000 != null || r.avg2000 != null,
    );
    return { rows: sorted, hasData: anyValue };
  }, [series, selectedTdu]);

  // Thin the X-axis labels so they stay readable as history accumulates. We aim
  // for at most ~9 labels: with a few days of data every point is labeled, and
  // as the window grows the stride widens (every 2nd day, 3rd day, …) so labels
  // never collide. First and last dates are always kept so the axis spans the
  // full range; a near-duplicate final tick is dropped to avoid crowding the
  // right edge.
  const xTicks = useMemo(() => {
    const n = rows.length;
    if (n <= 1) return rows.map((r) => r.date);
    const TARGET = 9;
    const stride = Math.max(1, Math.ceil((n - 1) / (TARGET - 1)));
    const idx: number[] = [];
    for (let i = 0; i < n; i += stride) idx.push(i);
    const lastIdx = n - 1;
    if (idx[idx.length - 1] !== lastIdx) {
      if (lastIdx - idx[idx.length - 1] < stride / 2) idx.pop();
      idx.push(lastIdx);
    }
    return idx.map((i) => rows[i].date);
  }, [rows]);

  // Tight, data-driven Y range so small day-to-day moves are actually visible
  // instead of being flattened by a fixed 0-based axis. Recomputes whenever the
  // rows change (TDU switch, tier data, or a fresh nightly snapshot from the
  // poll), so the zoom keeps adjusting as history accumulates. We pad the span
  // by ~12% (min 0.2¢) and round to a tenth of a cent for clean ticks.
  const yDomain = useMemo<[number, number] | ["auto", "auto"]>(() => {
    const vals = rows.flatMap((r) =>
      [r.avg500, r.avg1000, r.avg2000].filter((v): v is number => v != null),
    );
    if (vals.length === 0) return ["auto", "auto"];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max((max - min) * 0.12, 0.2);
    return [Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10];
  }, [rows]);

  const colorFor = (key: TierKey, fallback: string) =>
    key === "avg1000" ? accent : fallback;

  const muted = "var(--muted-foreground)";
  const border = "var(--border)";

  if (loading) {
    return (
      <div className="h-[300px] w-full animate-pulse rounded-sm bg-muted/30" aria-hidden="true" />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 border border-border/40 bg-background/40 p-6 font-mono text-xs text-muted-foreground">
        <span>Couldn&apos;t load price history.</span>
        <button
          type="button"
          onClick={() => load()}
          className="text-accent underline underline-offset-4 hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="border border-border/40 bg-background/40 p-6 font-mono text-xs text-muted-foreground">
        No price history yet for your area. Check back soon — we capture rates daily.
      </div>
    );
  }

  const multiTdu = (series?.length ?? 0) > 1;

  return (
    <div className="w-full">
      {/* TDU selector — only when more than one utility serves the ZIP. Each
          pick swaps the three usage-tier lines to that utility's data. */}
      {multiTdu && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {(series ?? []).map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => setActiveTdu(s.code)}
              aria-pressed={selectedTdu === s.code}
              className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                selectedTdu === s.code
                  ? "border-accent text-accent"
                  : "border-foreground/20 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
              }`}
            >
              {tduLabel(s.code)}
            </button>
          ))}
        </div>
      )}

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 18, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={border} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: muted, fontSize: 10, fontFamily: "var(--font-mono, monospace)" }}
              tickLine={false}
              tickMargin={8}
              axisLine={{ stroke: border }}
              ticks={xTicks}
              interval={0}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis
              tick={{ fill: muted, fontSize: 10, fontFamily: "var(--font-mono, monospace)" }}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={yDomain}
              allowDecimals
              tickFormatter={(v: number) => `${Number(v.toFixed(2))}¢`}
            />
            <Tooltip
              cursor={{ stroke: accent, strokeWidth: 1, strokeOpacity: 0.4 }}
              contentStyle={{
                background: "var(--background)",
                border: `1px solid var(--border)`,
                borderRadius: 4,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
              }}
              labelStyle={{ color: "var(--foreground)" }}
              labelFormatter={(label: string) => formatDateLong(label)}
              formatter={(value: number | string, name: string) => [`${value}¢/kWh`, name]}
            />
            <Legend
              verticalAlign="bottom"
              height={28}
              iconType="plainline"
              formatter={(value: string) => (
                <span
                  style={{
                    color: "var(--muted-foreground)",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {value}
                </span>
              )}
            />
            {TIERS.map((t) => (
              <Line
                key={t.key}
                type="monotone"
                dataKey={t.key}
                name={t.label}
                stroke={colorFor(t.key, t.color)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: colorFor(t.key, t.color) }}
                connectNulls
                isAnimationActive
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
