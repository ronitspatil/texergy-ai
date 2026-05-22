"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { SectionLabel } from "@/components/ui/section-label"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const signals = [
  {
    date: "START",
    title: "Enter ZIP",
    note: "Begin with your Texas ZIP code so Texergy only compares plans available in your service area.",
  },
  {
    date: "DETAILS",
    title: "Add Basics",
    note: "Share usage, household profile, expected pricing range, and bill details so estimates reflect your real situation.",
  },
  {
    date: "WEIGHTS",
    title: "Tune Fit",
    note: "Pick preferences like rate type, renewability, contract length, fees, and adjust weights around what matters most.",
  },
  {
    date: "MATCHES",
    title: "Review Plans",
    note: "See top matching plans, open expandable details, compare tradeoffs, and chat through questions before deciding.",
  },
  {
    date: "BUY",
    title: "Sign Up",
    note: "When a plan looks right, Texergy makes it easy to get started with your chosen provider.",
  },
]

export function SignalsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !cardsRef.current) return

    const ctx = gsap.context(() => {
      // Header slide in from left
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

      const cards = cardsRef.current?.querySelectorAll("article")
      if (cards) {
        gsap.fromTo(
          cards,
          { x: -100, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: cardsRef.current,
              start: "top 90%",
              toggleActions: "play none none reverse",
            },
          },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section id="signals" ref={sectionRef} className="relative py-32 pl-6 md:pl-28">

      {/* Section header */}
      <div ref={headerRef} className="mb-16 pr-6 md:pr-12">
        <SectionLabel>02 / How It Works</SectionLabel>
        <h2 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight">STEP BY STEP</h2>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={(el) => {
          scrollRef.current = el
          cardsRef.current = el
        }}
        className="flex gap-8 overflow-x-auto pb-8 pr-12 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {signals.map((signal, index) => (
          <SignalCard key={index} signal={signal} index={index} />
        ))}
      </div>
    </section>
  )
}

function SignalCard({
  signal,
  index,
}: {
  signal: { date: string; title: string; note: string }
  index: number
}) {
  return (
    <article
      className={cn(
        "group relative flex-shrink-0 w-80",
        "transition-transform duration-500 ease-out",
        "hover:-translate-y-2",
      )}
    >
      {/* Card with paper texture effect */}
      <div className="relative bg-card border border-border/50 md:border-t md:border-l md:border-r-0 md:border-b-0 p-8">
        {/* Top torn edge effect */}
        <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

        {/* Issue number - editorial style */}
        <div className="flex items-baseline justify-between mb-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            No. {String(index + 1).padStart(2, "0")}
          </span>
          <time className="font-mono text-[10px] text-muted-foreground/60">{signal.date}</time>
        </div>

        {/* Title */}
        <h3 className="font-[var(--font-bebas)] text-4xl tracking-tight mb-4 group-hover:text-accent transition-colors duration-300">
          {signal.title}
        </h3>

        {/* Divider line */}
        <div className="w-12 h-px bg-accent/60 mb-6 group-hover:w-full transition-all duration-500" />

        {/* Description */}
        <p className="font-mono text-xs text-muted-foreground leading-relaxed">{signal.note}</p>

        {/* Bottom right corner fold effect */}
        <div className="absolute bottom-0 right-0 w-6 h-6 overflow-hidden">
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-background rotate-45 translate-x-4 translate-y-4 border-t border-l border-border/30" />
        </div>
      </div>

      {/* Shadow/depth layer */}
      <div className="absolute inset-0 -z-10 translate-x-1 translate-y-1 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </article>
  )
}
