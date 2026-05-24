"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { SectionLabel } from "@/components/ui/section-label"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

type Artifact = "usage" | "rate" | "etf" | "history" | "transparency" | "renew" | "weather"

type Variable = {
  kind: string
  title: string
  blurb: string
  artifact: Artifact
  /** Tailwind span classes for md+ breakpoints. Mobile collapses to 1 col. */
  span: string
  /** Bigger artifact + secondary line for the featured card. */
  featured?: boolean
}

const variables: Variable[] = [
  {
    kind: "Variable 01",
    title: "Usage",
    blurb: "Monthly kWh, seasonal swings, and household patterns shape projected plan cost.",
    artifact: "usage",
    span: "md:col-span-2 md:row-span-2",
    featured: true,
  },
  {
    kind: "Variable 02",
    title: "Rate Preferences",
    blurb: "Fixed, variable, bill-credit structures, and contract length all affect fit.",
    artifact: "rate",
    span: "md:col-span-2 md:row-span-1",
  },
  {
    kind: "Variable 03",
    title: "ETFs",
    blurb: "Early termination fees, cancellation terms, switching costs, and exit penalties priced in.",
    artifact: "etf",
    span: "md:col-span-2 md:row-span-1",
  },
  {
    kind: "Variable 04",
    title: "Pricing History",
    blurb: "Distinguishes durable value from a plan that only looks good today.",
    artifact: "history",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    kind: "Variable 05",
    title: "Renewability",
    blurb: "Green-energy content, REC claims, and clean-power preferences weighted alongside price.",
    artifact: "renew",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    kind: "Variable 06",
    title: "Bill Transparency",
    blurb: "Penalizes bill-credit thresholds, minimum-usage fees, and tier cliffs.",
    artifact: "transparency",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    kind: "Variable 07",
    title: "Weather Forecasts",
    blurb: "Texas weather drives usage. Forecasts factor into expected monthly cost.",
    artifact: "weather",
    span: "md:col-span-1 md:row-span-1",
  },
]

export function WorkSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { x: -60, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: headerRef.current,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          },
        )
      }
      const cards = gridRef.current?.querySelectorAll("article")
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          },
        )
      }
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="work" className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12">
      <ArtifactStyles />
      <div ref={headerRef} className="mb-16 max-w-3xl">
        <SectionLabel>03 / Engine</SectionLabel>
        <h2 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          SMART MATCH ENGINE
        </h2>
        <p className="mt-6 font-mono text-sm text-muted-foreground leading-relaxed max-w-xl">
          Seven independent signals feed every recommendation. No headline rate moves the needle
          on its own.
        </p>
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5 auto-rows-[210px] md:auto-rows-[240px] max-w-[1400px] mx-auto"
      >
        {variables.map((v, i) => (
          <VariableCard key={v.title} variable={v} index={i} />
        ))}
      </div>
    </section>
  )
}

function VariableCard({ variable, index }: { variable: Variable; index: number }) {
  return (
    <article
      className={cn(
        "group relative border border-border/40 bg-background/40 hover:border-accent hover:bg-accent/[0.04] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.22)] transition-all duration-300 overflow-hidden p-5 md:p-6",
        variable.span,
      )}
    >
      {/* Corner notch — same idiom as ServiceCard in signals-section */}
      <span
        aria-hidden
        className="absolute top-0 right-0 w-0 h-0 border-t-[14px] border-l-[14px] border-l-transparent border-t-accent/0 group-hover:border-t-accent transition-colors duration-300"
      />

<div className="relative h-full flex flex-col">
        {/* Eyebrow */}
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          {variable.kind}
        </div>

        {/* Title */}
        <h3
          className={cn(
            "mt-2 font-[var(--font-bebas)] tracking-tight leading-none text-foreground group-hover:text-accent transition-colors duration-300",
            variable.featured ? "text-4xl md:text-6xl" : "text-2xl md:text-3xl",
          )}
        >
          {variable.title.toUpperCase()}
        </h3>

        {/* Body */}
        <p
          className={cn(
            "mt-3 font-mono text-muted-foreground leading-relaxed",
            variable.featured ? "text-xs md:text-sm max-w-[36ch]" : "text-[11px] max-w-[34ch]",
          )}
        >
          {variable.blurb}
        </p>

        {/* Artifact — anchored to the bottom-right of the card */}
        <div className="mt-auto self-end text-foreground/30 group-hover:text-accent transition-colors duration-300">
          <ArtifactSvg kind={variable.artifact} size={variable.featured ? "lg" : "sm"} />
        </div>
      </div>
    </article>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Artifact line-art SVGs. Match the stroke weight of icons in signals-section
// (stroke 1.6 in ServiceCard, slightly thinner here to read at smaller sizes).
// ────────────────────────────────────────────────────────────────────────────
// Per-artifact hover animation styles. Lines redraw via stroke-dash, shapes
// scale/rotate/translate. All triggered by `.group:hover` from the parent card.
const ARTIFACT_STYLES = `
  .art-line { stroke-dasharray: 240; stroke-dashoffset: 0; }
  .group:hover .art-redraw { animation: art-redraw 0.9s ease-out; }
  @keyframes art-redraw {
    0% { stroke-dashoffset: 240; }
    100% { stroke-dashoffset: 0; }
  }
  .art-bar { transform-origin: center bottom; transform: scaleY(1); transition: transform 0.5s cubic-bezier(0.34, 1.2, 0.64, 1); }
  .group:hover .art-bar { transform: scaleY(0); transition: none; }
  .group:hover .art-bar.art-bar-1 { animation: art-rise 0.6s 0.05s cubic-bezier(0.34, 1.2, 0.64, 1) forwards; }
  .group:hover .art-bar.art-bar-2 { animation: art-rise 0.6s 0.18s cubic-bezier(0.34, 1.2, 0.64, 1) forwards; }
  .group:hover .art-bar.art-bar-3 { animation: art-rise 0.6s 0.32s cubic-bezier(0.34, 1.2, 0.64, 1) forwards; }
  @keyframes art-rise {
    0% { transform: scaleY(0); }
    100% { transform: scaleY(1); }
  }
  .art-spin { transform-box: fill-box; transform-origin: center; transition: transform 0.8s ease-out; }
  .group:hover .art-spin { transform: rotate(45deg); }
  .art-drift { transition: transform 0.6s ease-out; }
  .group:hover .art-drift { transform: translateX(4px); }
  .art-pulse { transform-box: fill-box; transform-origin: center; transition: transform 0.35s ease-out; }
  .group:hover .art-pulse { transform: scale(1.25); }
  .art-dot { transform-box: fill-box; transform-origin: center; }
  .group:hover .art-dot { animation: art-pulse-dot 0.8s ease-out; }
  @keyframes art-pulse-dot {
    0% { transform: scale(1); }
    50% { transform: scale(1.6); }
    100% { transform: scale(1); }
  }
`

function ArtifactStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ARTIFACT_STYLES }} />
}

function ArtifactSvg({ kind, size = "sm" }: { kind: Artifact; size?: "sm" | "lg" }) {
  const dims = size === "lg" ? { width: 132, height: 84 } : { width: 72, height: 48 }
  const common = {
    ...dims,
    viewBox: "0 0 84 56",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  switch (kind) {
    // Annual kWh sparkline — winter low, summer peak; line redraws on hover
    case "usage":
      return (
        <svg {...common}>
          <line x1="6" y1="48" x2="78" y2="48" opacity="0.3" />
          <path className="art-line art-redraw" d="M6 40 L14 36 L22 30 L30 22 L38 14 L46 10 L54 14 L62 22 L70 32 L78 42" />
          <circle className="art-dot" cx="46" cy="10" r="1.8" fill="currentColor" stroke="none" />
        </svg>
      )
    // Fixed (flat) vs variable (zig-zag) rate lines; both redraw
    case "rate":
      return (
        <svg {...common}>
          <line className="art-line art-redraw" x1="6" y1="20" x2="78" y2="20" />
          <path className="art-line art-redraw" d="M6 40 L16 34 L26 44 L36 36 L46 46 L56 36 L66 44 L78 36" />
        </svg>
      )
    // Contract page with $ figure; $ pulses on hover
    case "etf":
      return (
        <svg {...common}>
          <path d="M20 6 L62 6 L62 50 L20 50 Z" />
          <line x1="28" y1="18" x2="54" y2="18" />
          <line x1="28" y1="26" x2="54" y2="26" />
          <line x1="28" y1="34" x2="46" y2="34" />
          <text className="art-pulse" x="41" y="46" fontSize="9" fill="currentColor" stroke="none" fontFamily="monospace" textAnchor="middle">$</text>
          <path d="M56 6 L62 12 L56 12 Z" fill="currentColor" stroke="none" opacity="0.4" />
        </svg>
      )
    // Price history line redraws; endpoint dot pulses
    case "history":
      return (
        <svg {...common}>
          <line x1="6" y1="48" x2="78" y2="48" opacity="0.3" />
          <line x1="6" y1="48" x2="6" y2="8" opacity="0.3" />
          <path className="art-line art-redraw" d="M6 22 L18 28 L30 38 L42 42 L54 36 L66 26 L78 12" />
          <circle cx="42" cy="42" r="1.8" fill="currentColor" stroke="none" />
          <circle className="art-dot" cx="78" cy="12" r="1.8" fill="currentColor" stroke="none" />
        </svg>
      )
    // Tier-cliff bars rise from baseline in sequence on hover
    case "transparency":
      return (
        <svg {...common}>
          <line x1="6" y1="48" x2="78" y2="48" opacity="0.3" />
          <rect className="art-bar art-bar-1" x="10" y="36" width="14" height="12" />
          <rect className="art-bar art-bar-2" x="30" y="26" width="14" height="22" />
          <rect className="art-bar art-bar-3" x="50" y="14" width="14" height="34" />
        </svg>
      )
    // Sun rotates a quarter-turn on hover
    case "renew":
      return (
        <svg {...common}>
          <g className="art-spin" style={{ transformOrigin: "22px 28px" }}>
            <circle cx="22" cy="28" r="8" />
            <line x1="22" y1="14" x2="22" y2="17" />
            <line x1="22" y1="39" x2="22" y2="42" />
            <line x1="8" y1="28" x2="11" y2="28" />
            <line x1="33" y1="28" x2="36" y2="28" />
            <line x1="13" y1="19" x2="15" y2="21" />
            <line x1="29" y1="35" x2="31" y2="37" />
            <line x1="13" y1="37" x2="15" y2="35" />
            <line x1="29" y1="21" x2="31" y2="19" />
          </g>
          <path d="M50 38 C50 26 60 18 72 18 C72 30 62 38 50 38 Z" />
          <line x1="54" y1="34" x2="68" y2="22" opacity="0.5" />
        </svg>
      )
    // Cloud drifts right + sun ticks; temp curve redraws
    case "weather":
      return (
        <svg {...common}>
          <g className="art-spin" style={{ transformOrigin: "20px 18px" }}>
            <circle cx="20" cy="18" r="6" />
            <line x1="20" y1="8" x2="20" y2="10" />
            <line x1="20" y1="26" x2="20" y2="28" />
            <line x1="10" y1="18" x2="12" y2="18" />
            <line x1="28" y1="18" x2="30" y2="18" />
          </g>
          <path className="art-drift" d="M40 24 C40 18 46 14 52 16 C55 12 62 12 64 16 C70 16 74 20 72 26 L40 26 Z" />
          <path className="art-line art-redraw" d="M6 48 Q24 36, 40 42 T78 38" opacity="0.7" />
        </svg>
      )
  }
}
