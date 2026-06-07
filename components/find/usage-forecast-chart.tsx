"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UsageGraphPoint } from "@/components/find/wizard-types";

type Metric = "kwh" | "cost";

/** Resolve a CSS custom property to a concrete color string so recharts can
 *  use it in SVG fill/stroke attributes (custom properties aren't valid there
 *  directly). Resolved once on mount for the active theme. */
function useThemeColors() {
  const [colors, setColors] = useState({
    accent: "#d96a3a",
    muted: "#8a8a8a",
    border: "#d8d8d8",
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cs = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
    setColors({
      accent: read("--accent", "#d96a3a"),
      muted: read("--muted-foreground", "#8a8a8a"),
      border: read("--border", "#d8d8d8"),
    });
  }, []);
  return colors;
}

/** 12-month usage/cost forecast area chart. Toggles between kWh and $ when the
 *  series carries cost data. Used compact inside the estimate modal and full
 *  width on the plan-match page. */
export function UsageForecastChart({
  graph,
  compact = false,
}: {
  graph: UsageGraphPoint[];
  compact?: boolean;
}) {
  const hasCost = graph.some((p) => p.cost != null);
  const [metric, setMetric] = useState<Metric>("kwh");
  const colors = useThemeColors();

  const active: Metric = metric === "cost" && !hasCost ? "kwh" : metric;

  return (
    <div className="w-full">
      {hasCost && (
        <div className="mb-3 flex items-center gap-1.5">
          {(["kwh", "cost"] as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              aria-pressed={active === m}
              className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                active === m
                  ? "border-accent text-accent"
                  : "border-foreground/20 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
              }`}
            >
              {m === "kwh" ? "kWh" : "Cost"}
            </button>
          ))}
        </div>
      )}
      <div style={{ width: "100%", height: compact ? 180 : 260 }}>
        <ResponsiveContainer>
          <AreaChart data={graph} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={colors.accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={colors.border} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: colors.muted, fontSize: 10, fontFamily: "var(--font-mono, monospace)" }}
              tickLine={false}
              axisLine={{ stroke: colors.border }}
              interval={compact ? 1 : 0}
            />
            <YAxis
              tick={{ fill: colors.muted, fontSize: 10, fontFamily: "var(--font-mono, monospace)" }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => (active === "cost" ? `$${v}` : `${v}`)}
            />
            <Tooltip
              cursor={{ stroke: colors.accent, strokeWidth: 1, strokeOpacity: 0.4 }}
              contentStyle={{
                background: "var(--background)",
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
              }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(value: number | string) => [
                active === "cost" ? `$${value}` : `${value} kWh`,
                active === "cost" ? "Est. bill" : "Usage",
              ]}
            />
            <Area
              type="monotone"
              dataKey={active}
              stroke={colors.accent}
              strokeWidth={2}
              fill="url(#usageFill)"
              dot={false}
              activeDot={{ r: 3, fill: colors.accent }}
              name={active === "cost" ? "Est. bill" : "Usage"}
              isAnimationActive={!compact}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
