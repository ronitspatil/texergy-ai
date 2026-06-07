"use client"

import { useRef, useEffect, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

type Artifact = "usage" | "rate" | "etf" | "history" | "transparency" | "renew" | "weather"

type Signal = {
  kind: string
  title: string
  blurb: string
  artifact: Artifact
  weight: number // 0–1, illustrative default weight
}

// Illustrative weights — not live. These represent a "usage-first" profile
// so the section demonstrates the weighting concept at a glance.
const signals: Signal[] = [
  { kind: "01", title: "Usage",        blurb: "kWh + seasonal swings",    artifact: "usage",        weight: 0.82 },
  { kind: "02", title: "Rate Type",    blurb: "Fixed / variable",          artifact: "rate",         weight: 0.71 },
  { kind: "03", title: "Exit Fees",    blurb: "Termination + switching",   artifact: "etf",          weight: 0.54 },
  { kind: "04", title: "Price History",blurb: "Durable value over time",   artifact: "history",      weight: 0.47 },
  { kind: "05", title: "Renewable",    blurb: "Green content + RECs",      artifact: "renew",        weight: 0.38 },
  { kind: "06", title: "Transparency", blurb: "Thresholds + tier cliffs",  artifact: "transparency", weight: 0.62 },
  { kind: "07", title: "Weather",      blurb: "Drives Texas usage",        artifact: "weather",      weight: 0.29 },
]

type Plan = {
  rank: string
  fit: number
  accent?: boolean
  specs: SpecKind[]
  curve: number[]
  features: string[]
}

const BASE_CURVE = [0.34, 0.31, 0.38, 0.49, 0.67, 0.85, 1, 0.95, 0.74, 0.52, 0.39, 0.44]
const scaleCurve = (k: number) => BASE_CURVE.map((v) => 0.42 + v * k)

const plans: Plan[] = [
  {
    rank: "01",
    fit: 0.95,
    accent: true,
    specs: ["fixed", "renew", "term", "noetf"],
    curve: scaleCurve(0.58),
    features: ["Fixed rate", "Renewable", "No exit fee"],
  },
  {
    rank: "02",
    fit: 0.86,
    specs: ["fixed", "term", "deposit"],
    curve: scaleCurve(0.62),
    features: ["Fixed rate", "Locked term", "Autopay"],
  },
  {
    rank: "03",
    fit: 0.78,
    specs: ["variable", "renew"],
    curve: scaleCurve(0.7),
    features: ["Variable rate", "Partial green", "No deposit"],
  },
]

export function WorkSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const pipeRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<number | null>(0)

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          x: -60,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      }

      if (pipeRef.current) {
        const st = { trigger: pipeRef.current, start: "top 80%", toggleActions: "play none none reverse" }

        gsap.from(pipeRef.current.querySelectorAll(".pipe-input"), {
          x: -20, opacity: 0, duration: 0.55, stagger: 0.06, ease: "power3.out", scrollTrigger: st,
        })
        gsap.from(pipeRef.current.querySelectorAll(".pipe-engine"), {
          opacity: 0, scale: 0.92, duration: 0.6, delay: 0.28, ease: "back.out(1.5)", scrollTrigger: st,
        })
        gsap.from(pipeRef.current.querySelectorAll(".pipe-output"), {
          x: 20, opacity: 0, duration: 0.55, delay: 0.35, ease: "power3.out", scrollTrigger: st,
        })

        // Staggered weight-bar fill — each bar animates to its illustrative weight
        const bars = Array.from(pipeRef.current.querySelectorAll(".weight-fill"))
        bars.forEach((bar, i) => {
          const w = (bar as HTMLElement).dataset.weight ?? "0"
          gsap.fromTo(bar,
            { width: "0%" },
            {
              width: `${w}%`,
              duration: 0.85,
              delay: i * 0.055,
              ease: "power2.out",
              scrollTrigger: st,
            }
          )
        })
      }
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="work" className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12">
      <ArtifactStyles />

      <div ref={headerRef} className="mb-16 max-w-3xl">
        <h2 className="font-display text-5xl md:text-7xl tracking-tight leading-none">SMART MATCH ENGINE</h2>
        <p className="mt-6 font-mono text-sm text-muted-foreground leading-relaxed max-w-xl">
          Seven signals feed every match, and you set the weights. Dial each one up or down and the engine
          re-ranks every plan around what actually matters to you, hyper-personalized to your home.
        </p>
      </div>

      <div ref={pipeRef} className="max-w-[1400px] mx-auto lg:-translate-x-8">

        {/* ── Desktop: inputs | arrow | output ────────────────────────── */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,1fr)] lg:gap-16 lg:items-stretch">

          {/* INPUTS — clean signal list with per-signal weight bars */}
          <div className="flex flex-col">
            <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground pipe-input">
              Inputs · 7 signals
            </div>
            <ul className="flex flex-1 flex-col border-t border-border/25">
              {signals.map((s) => (
                <WeightRow key={s.title} signal={s} />
              ))}
            </ul>
          </div>


          {/* OUTPUT — ranked plan cards */}
          <div className="pipe-output flex flex-col">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Output · Ranked plans
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
                Best fit first
              </span>
            </div>
            <ul className="flex h-[420px] flex-col gap-3 overflow-hidden" onMouseLeave={() => setOpen(0)}>
              {plans.map((p, i) => (
                <PlanCard key={p.rank} plan={p} expanded={open === i} onExpand={() => setOpen(i)} />
              ))}
            </ul>
          </div>
        </div>

        {/* ── Mobile: stacked ──────────────────────────────────────────── */}
        <div className="lg:hidden flex flex-col gap-8">
          <div>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Inputs · 7 signals
            </div>
            <ul className="flex flex-col border-t border-border/25">
              {signals.map((s) => (
                <WeightRow key={s.title} signal={s} mobile />
              ))}
            </ul>
          </div>


          <div>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Output · Ranked plans
            </div>
            <ul className="flex flex-col gap-3 pipe-output">
              {plans.map((p, i) => (
                <PlanCard key={p.rank} plan={p} expanded={open === i} onExpand={() => setOpen(i)} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// WEIGHT ROW — one signal with its adjustable weight visualised as a fill bar.
// The bar animates from 0 → target on scroll (driven by GSAP in WorkSection).
// HIGH ≥ 0.65 · MED ≥ 0.42 · LOW otherwise
// ────────────────────────────────────────────────────────────────────────────
function WeightRow({ signal, mobile = false }: { signal: Signal; mobile?: boolean }) {
  const label = signal.weight >= 0.65 ? "HIGH" : signal.weight >= 0.42 ? "MED" : "LOW"
  return (
    <li
      className={`group pipe-input flex items-center gap-3 border-b border-border/25 transition-colors duration-200 hover:bg-foreground/[0.018] ${
        mobile ? "py-3 px-0" : "flex-1 px-4"
      }`}
    >
      {/* Animated instrument icon */}
      <span className="shrink-0 text-foreground/35 group-hover:text-accent transition-colors duration-300">
        <ArtifactSvg kind={signal.artifact} size="xs" />
      </span>

      <div className="min-w-0 flex-1 flex flex-col gap-[5px]">
        {/* Signal name row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[9px] tabular-nums text-accent/60 shrink-0">{signal.kind}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-foreground group-hover:text-accent transition-colors duration-300 truncate">
              {signal.title}
            </span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/40 shrink-0">
            {label}
          </span>
        </div>

        {/* Weight bar — fills from 0 to signal.weight on scroll */}
        <div className="relative h-[2px] bg-foreground/[0.07] w-full">
          <div
            className="weight-fill absolute left-0 top-0 h-full bg-accent/50 group-hover:bg-accent transition-colors duration-300"
            data-weight={Math.round(signal.weight * 100)}
            style={{ width: "0%" }}
          />
        </div>

        <span className="font-mono text-[9px] text-muted-foreground/40 leading-none truncate">
          {signal.blurb}
        </span>
      </div>
    </li>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// OUTPUT — ranked-plan card. Collapsed: rank, redacted identity, spec chips,
// fit ring. Hover expands a drawer with a 12-month forecast chart and enroll CTA.
// ────────────────────────────────────────────────────────────────────────────
function PlanCard({ plan, expanded, onExpand }: { plan: Plan; expanded: boolean; onExpand: () => void }) {
  const accent = !!plan.accent
  return (
    <li
      onMouseEnter={onExpand}
      className={`group/plan flex flex-col border bg-background/70 transition-colors duration-300 ${
        expanded ? "flex-1" : ""
      } ${
        expanded
          ? accent
            ? "border-accent/60 shadow-e2"
            : "border-foreground/35 shadow-e2"
          : accent
          ? "border-accent/40 hover:border-accent/70"
          : "border-border/45 hover:border-foreground/35"
      }`}
    >
      <button onClick={onExpand} onFocus={onExpand} aria-expanded={expanded} className="flex w-full items-center gap-3.5 px-3.5 py-3 text-left">
        <span className={`shrink-0 font-display text-3xl leading-none tabular-nums ${accent ? "text-accent" : "text-foreground/45"}`}>
          {plan.rank}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`block h-2.5 w-24 ${accent ? "bg-accent/35" : "bg-foreground/20"}`} />
            <span className="block h-2.5 w-10 bg-foreground/12" />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {plan.specs.map((s) => (
              <SpecChip key={s} kind={s} accent={accent} />
            ))}
          </div>
        </div>

        <FitRing value={plan.fit} accent={accent} />

        <span
          aria-hidden
          className={`shrink-0 text-foreground/40 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </button>

      <div className={`grid transition-[grid-template-rows] duration-400 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-border/40 px-3.5 pb-3.5 pt-3">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">Forecast · 12 mo</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">Est. monthly cost</span>
            </div>
            <ForecastChart data={plan.curve} accent={accent} active={expanded} />

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {plan.features.map((f) => (
                <span key={f} className="border border-border/50 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  {f}
                </span>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors ${
                  accent
                    ? "bg-accent text-accent-foreground hover:brightness-95"
                    : "border border-foreground/25 text-foreground hover:border-accent hover:text-accent"
                }`}
              >
                Enroll
                <span aria-hidden>→</span>
              </span>
              <span className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">
                Details
              </span>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

function ForecastChart({ data, accent, active }: { data: number[]; accent: boolean; active: boolean }) {
  const max = Math.max(...data)
  return (
    <div className="flex h-16 items-end gap-[3px]">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 ${accent ? "bg-accent/80" : "bg-foreground/40"}`}
          style={{
            height: active ? `${(v / max) * 100}%` : "0%",
            transition: "height 0.5s cubic-bezier(0.34,1.1,0.64,1)",
            transitionDelay: active ? `${i * 28}ms` : "0ms",
          }}
        />
      ))}
    </div>
  )
}

function FitRing({ value, accent }: { value: number; accent: boolean }) {
  const r = 13
  const c = 2 * Math.PI * r
  return (
    <span className="relative shrink-0" style={{ width: 34, height: 34 }} aria-hidden>
      <svg width="34" height="34" viewBox="0 0 34 34" className="-rotate-90">
        <circle cx="17" cy="17" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground/12" />
        <circle
          cx="17" cy="17" r={r}
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value)}
          className={accent ? "text-accent" : "text-foreground/55"}
        />
      </svg>
      <span className={`absolute inset-0 m-auto h-1.5 w-1.5 rounded-full ${accent ? "bg-accent" : "bg-foreground/45"}`} />
    </span>
  )
}

type SpecKind = "fixed" | "variable" | "renew" | "term" | "noetf" | "deposit"

function SpecChip({ kind, accent }: { kind: SpecKind; accent: boolean }) {
  const tint = accent ? "text-accent/70 border-accent/30" : "text-foreground/45 border-border/55"
  return (
    <span className={`inline-flex h-[18px] w-[18px] items-center justify-center border ${tint}`} aria-hidden>
      <SpecIcon kind={kind} />
    </span>
  )
}

function SpecIcon({ kind }: { kind: SpecKind }) {
  const c = { width: 11, height: 11, viewBox: "0 0 16 16", fill: "none" as const, stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (kind) {
    case "fixed":    return <svg {...c}><rect x="3.5" y="7" width="9" height="6" rx="0.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
    case "variable": return <svg {...c}><path d="M2 9c1.5-3 3-3 4.5 0S9.5 12 11 9s2.5-3 3 0" /></svg>
    case "renew":    return <svg {...c}><path d="M13 3C6 3 3 6 3 11c0 1 .5 2 .5 2s4 1 7-2 2.5-8 2.5-8Z" /><path d="M3.5 13C6 9 9 7 11 6" /></svg>
    case "term":     return <svg {...c}><rect x="3" y="4" width="10" height="9" rx="0.5" /><path d="M3 7h10M6 2.5v2M10 2.5v2" /></svg>
    case "noetf":    return <svg {...c}><path d="M8.5 2.5H13V7l-6 6-4.5-4.5 6-6Z" /><circle cx="10.5" cy="5" r="0.6" fill="currentColor" stroke="none" /></svg>
    case "deposit":  return <svg {...c}><path d="M8 2.5v11M10.5 5a2.5 2.5 0 0 0-5 .3C5.5 7 8 7 8 8s2.5 1 2.5 2.7A2.5 2.5 0 0 1 5.5 11" /></svg>
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Signal artifacts — animated instrument icons. Each animates on row hover.
// ────────────────────────────────────────────────────────────────────────────
const ARTIFACT_STYLES = `
  .art-needle { transform-box: view-box; transform-origin: 16px 23px; transform: rotate(-52deg); transition: transform 0.7s cubic-bezier(0.34,1.15,0.5,1); }
  .group:hover .art-needle { transform: rotate(52deg); }
  .art-swing { transform-box: fill-box; transform-origin: 16px 5px; transform: rotate(0deg); transition: transform 0.6s cubic-bezier(0.34,1.4,0.5,1); }
  .group:hover .art-swing { transform: rotate(8deg); }
  .art-link-a { transition: transform 0.5s cubic-bezier(0.34,1.2,0.5,1); }
  .group:hover .art-link-a { transform: translate(-2.5px,-2.5px); }
  .art-link-b { transition: transform 0.5s cubic-bezier(0.34,1.2,0.5,1); }
  .group:hover .art-link-b { transform: translate(2.5px,2.5px); }
  .art-graph { stroke-dasharray: 60; stroke-dashoffset: 0; }
  .group:hover .art-graph { animation: art-draw 0.75s ease-out; }
  @keyframes art-draw { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }
  .art-tip { transform-box: fill-box; transform-origin: center; transition: transform 0.4s ease-out; }
  .group:hover .art-tip { transform: scale(1.7); }
  .art-grow { transform-box: fill-box; transform-origin: 22px 22px; transform: scale(0.86); transition: transform 0.55s cubic-bezier(0.34,1.3,0.5,1); }
  .group:hover .art-grow { transform: scale(1.04) rotate(-4deg); }
  .art-iris { transform-box: fill-box; transform-origin: center; transition: transform 0.4s ease-out; }
  .group:hover .art-iris { transform: scale(1.35); }
  .art-sun { transform-box: fill-box; transform-origin: center; transition: transform 1s ease-out; }
  .group:hover .art-sun { transform: rotate(45deg); }
  .art-cloud { transition: transform 0.6s cubic-bezier(0.34,1.2,0.5,1); }
  .group:hover .art-cloud { transform: translateX(2.5px); }
  @media (prefers-reduced-motion: reduce) {
    .art-needle,.art-swing,.art-link-a,.art-link-b,.art-tip,.art-grow,.art-iris,.art-sun,.art-cloud { transition: none; }
    .art-graph { animation: none; }
  }
`

function ArtifactStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ARTIFACT_STYLES }} />
}

function ArtifactSvg({ kind, size = "sm" }: { kind: Artifact; size?: "xs" | "sm" | "lg" }) {
  const px = size === "lg" ? 40 : size === "xs" ? 26 : 32
  const common = {
    width: px, height: px, viewBox: "0 0 32 32",
    fill: "none" as const, stroke: "currentColor",
    strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }
  switch (kind) {
    case "usage":
      return <svg {...common}><path d="M5 23a11 11 0 0 1 22 0" /><path d="M5 23h2M25 23h2M9 14.5l1.4 1.4M16 11v2M23 14.5l-1.4 1.4" opacity="0.55" /><line className="art-needle" x1="16" y1="23" x2="16" y2="15" /><circle cx="16" cy="23" r="1.8" fill="currentColor" stroke="none" /></svg>
    case "rate":
      return <svg {...common}><g className="art-swing"><path d="M16 4h9v9L13 25 4 16 16 4Z" /><circle cx="20.5" cy="8.5" r="1.4" /></g></svg>
    case "etf":
      return <svg {...common}><rect className="art-link-a" x="6" y="13" width="11" height="6.5" rx="3.25" /><rect className="art-link-b" x="15" y="13" width="11" height="6.5" rx="3.25" /></svg>
    case "history":
      return <svg {...common}><path d="M6 5v22h22" opacity="0.4" /><path className="art-graph" d="M8 22 L12.5 17 L16 19 L20 12 L23.5 14.5 L28 7" /><circle className="art-tip" cx="28" cy="7" r="1.8" fill="currentColor" stroke="none" /></svg>
    case "renew":
      return <svg {...common}><g className="art-grow"><path d="M25 7C13 7 7 12 7 21c0 0 0 2 0 2s2 0 2 0c9 0 14-6 16-16Z" /><path d="M9 23C13 16 18 12 22 10" /></g></svg>
    case "transparency":
      return <svg {...common}><path d="M3 16s5-7 13-7 13 7 13 7-5 7-13 7S3 16 3 16Z" /><circle className="art-iris" cx="16" cy="16" r="3.4" /><circle cx="16" cy="16" r="1.1" fill="currentColor" stroke="none" /></svg>
    case "weather":
      return <svg {...common}><g className="art-sun" style={{ transformOrigin: "12px 12px" }}><circle cx="12" cy="12" r="4" /><path d="M12 4.5v1.5M12 18v1.5M4.5 12H6M18 12h1.5M6.8 6.8l1 1M16.2 16.2l1 1M6.8 17.2l1-1M16.2 7.8l1-1" /></g><path className="art-cloud" d="M11 24c-2.5 0-4-1.6-4-3.6S8.7 17 11 17c.4-2.3 2.4-3.8 4.7-3.8 2.6 0 4.4 1.7 4.7 3.9 2 .2 3.3 1.5 3.3 3.3S26 24 23.5 24H11Z" fill="var(--background)" /></svg>
  }
}
