"use client"

import { useRef, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

// ────────────────────────────────────────────────────────────────────────────
// Services rail — visually distinct from the main timeline. Each card is a
// substantial editorial unit: line-art icon, accent eyebrow, Bebas title,
// mono blurb, accent corner notch, sliding arrow.
// ────────────────────────────────────────────────────────────────────────────

type ServiceIcon = "meter" | "bars" | "book" | "lookup"

const SERVICES: {
  icon: ServiceIcon
  kind: string
  title: string
  blurb: string
  href: string
  comingSoon?: boolean
}[] = [
  {
    icon: "meter",
    kind: "Calculator",
    title: "Usage Calculator",
    blurb: "Five quick questions, no appliance tedium. Get a household kWh estimate in 10 seconds.",
    href: "/usage-calculator",
  },
  {
    icon: "bars",
    kind: "Calculator",
    title: "Savings Calculator",
    blurb: "Plug in your latest bill. See how much you'd save on the cheapest plan in your ZIP.",
    href: "/savings-calculator",
  },
  {
    icon: "book",
    kind: "Reference",
    title: "Texas Energy 101",
    blurb: "Plain-English crash course on the deregulated Texas market. EFLs, TDUs, kWh — demystified.",
    href: "/texas-energy-101",
  },
  {
    icon: "lookup",
    kind: "Lookup",
    title: "ESID Lookup",
    blurb: "Find the electric service identifier tied to any Texas address. Free, address-fuzzy.",
    href: "/esid-lookup",
  },
]

export function ToolsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { x: -40, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: headerRef.current,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          },
        )
      }

      const tools = toolsRef.current?.querySelectorAll("li")
      if (tools && tools.length > 0) {
        gsap.fromTo(
          tools,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: toolsRef.current,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          },
        )
      }
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="tools" className="relative py-24 pl-6 md:pl-28 pr-6 md:pr-12">
      <div ref={headerRef} className="mb-12 max-w-3xl">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
            Other tools
          </span>
          <span aria-hidden="true" className="flex-1 h-px bg-border/40 max-w-[120px]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
            Free to use
          </span>
        </div>
        <h3 className="font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight leading-none">
          NEED ANYTHING ELSE?
        </h3>
        <p className="mt-4 font-mono text-sm text-muted-foreground leading-relaxed max-w-xl">
          Lightweight tools you can use on their own. Most pipe back into the plan finder.
        </p>
      </div>

      <ul
        ref={toolsRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
      >
        {SERVICES.map((s) => (
          <li key={s.title}>
            <ServiceCard service={s} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function ServiceIconSvg({ name }: { name: ServiceIcon }) {
  const common = {
    width: 56,
    height: 56,
    viewBox: "0 0 56 56",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  switch (name) {
    case "meter":
      return (
        <svg {...common}>
          <path d="M14 36 A16 16 0 1 1 42 36" />
          <line x1="28" y1="36" x2="38" y2="22" />
          <circle cx="28" cy="36" r="2" fill="currentColor" stroke="none" />
          <line x1="28" y1="20" x2="28" y2="22" />
          <line x1="18" y1="26" x2="20" y2="27.5" />
          <line x1="38" y1="26" x2="36" y2="27.5" />
        </svg>
      )
    case "bars":
      return (
        <svg {...common}>
          <rect x="12" y="14" width="8" height="30" />
          <rect x="24" y="22" width="8" height="22" />
          <rect x="36" y="30" width="8" height="14" />
          <path d="M14 12 L46 12" strokeDasharray="2 3" opacity="0.35" />
        </svg>
      )
    case "book":
      return (
        <svg {...common}>
          <path d="M28 16 C24 13 18 13 12 14 L12 42 C18 41 24 41 28 44 C32 41 38 41 44 42 L44 14 C38 13 32 13 28 16 Z" />
          <line x1="28" y1="16" x2="28" y2="44" />
          <line x1="16" y1="22" x2="24" y2="21" />
          <line x1="16" y1="27" x2="24" y2="26" />
          <line x1="32" y1="21" x2="40" y2="22" />
          <line x1="32" y1="26" x2="40" y2="27" />
        </svg>
      )
    case "lookup":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="12" />
          <line x1="34" y1="34" x2="44" y2="44" />
          <line x1="24" y1="18" x2="24" y2="30" />
          <line x1="18" y1="24" x2="30" y2="24" />
        </svg>
      )
  }
}

function ServiceCard({ service }: { service: (typeof SERVICES)[number] }) {
  const Wrapper = service.comingSoon ? "div" : "a"
  const wrapperProps = service.comingSoon
    ? { "aria-disabled": "true" }
    : { href: service.href }

  return (
    <Wrapper
      {...(wrapperProps as Record<string, unknown>)}
      className={`group relative block border bg-background/40 transition-all duration-300 overflow-hidden ${
        service.comingSoon
          ? "border-border/30 opacity-50 cursor-not-allowed"
          : "border-border/40 hover:border-accent hover:bg-accent/[0.04] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.22)]"
      }`}
    >
      {!service.comingSoon && (
        <span
          aria-hidden="true"
          className="absolute top-0 right-0 w-0 h-0 border-t-[14px] border-l-[14px] border-t-accent/0 border-l-transparent group-hover:border-t-accent transition-colors duration-300"
        />
      )}

      <div className="grid grid-cols-[4.5rem_1fr] gap-5 p-5 sm:p-6 min-h-[180px]">
        <div className="flex items-start justify-center pt-1">
          <div
            className={`shrink-0 transition-colors duration-300 ${
              service.comingSoon
                ? "text-muted-foreground/35"
                : "text-foreground/30 group-hover:text-accent"
            }`}
          >
            <ServiceIconSvg name={service.icon} />
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {service.kind}
            </span>
            {service.comingSoon && (
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/60 border border-muted-foreground/30 px-1.5 py-0.5">
                Soon
              </span>
            )}
          </div>
          <h4
            className={`font-[var(--font-bebas)] text-2xl tracking-tight leading-none mb-3 transition-colors ${
              service.comingSoon ? "text-foreground/70" : "text-foreground group-hover:text-accent"
            }`}
          >
            {service.title.toUpperCase()}
          </h4>
          <p className="font-mono text-xs text-muted-foreground leading-relaxed">
            {service.blurb}
          </p>

          {!service.comingSoon && (
            <div className="mt-auto pt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground group-hover:text-accent transition-colors">
              <span>Open</span>
              <svg
                width="20"
                height="10"
                viewBox="0 0 20 10"
                fill="none"
                className="transition-transform duration-300 group-hover:translate-x-1.5"
                aria-hidden="true"
              >
                <path
                  d="M0 5h18M14 1l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  )
}
