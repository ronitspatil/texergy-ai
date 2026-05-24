"use client"

import { useRef, useEffect } from "react"
import { SectionLabel } from "@/components/ui/section-label"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const signals = [
  {
    date: "START",
    title: "Enter ZIP",
    note: "Tell us your Texas ZIP so Texergy only compares plans actually available in your service area. One keystroke — nothing leaves the page, no account required.",
  },
  {
    date: "DETAILS",
    title: "Add Basics",
    note: "Share your typical monthly usage and a rough sense of your bill. The more honest the inputs, the closer the projection matches what you'll actually pay.",
  },
  {
    date: "WEIGHTS",
    title: "Tune Fit",
    note: "Pick what matters: lowest rate, renewable mix, no termination fee, fixed term. Slide each weight to bias the engine toward what you actually care about.",
  },
  {
    date: "MATCHES",
    title: "Review Plans",
    note: "See the top plans ranked against your profile, with the math behind each ranking surfaced openly. Compare side-by-side and chat through tradeoffs before deciding.",
  },
  {
    date: "BUY",
    title: "Sign Up",
    note: "When a plan looks right, click through to the provider to enroll directly. Texergy hands you off cleanly — no upsells, no email captures, no middleman.",
  },
]

export function SignalsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLOListElement>(null)
  const railProgressRef = useRef<HTMLDivElement>(null)
  const markerRefs = useRef<(HTMLSpanElement | null)[]>([])
  const numberRefs = useRef<(HTMLSpanElement | null)[]>([])

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

      // Rail progress: scroll-driven fill from top → bottom of the steps list.
      // start: when the steps list crosses 70% of viewport (just below fold)
      // end:   when the last step exits past 80% (so the line completes at the
      //        natural reading-end of the section, not at the page bottom).
      if (railProgressRef.current && stepsRef.current) {
        gsap.fromTo(
          railProgressRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: stepsRef.current,
              start: "top 70%",
              end: "bottom 80%",
              scrub: 0.5,
            },
          },
        )
      }

      // Per-row slide-in from the left. Subtle — the scroll-driven rail is
      // the headline animation; row entry is supporting choreography.
      const rows = stepsRef.current?.querySelectorAll("li")
      if (rows && rows.length > 0) {
        rows.forEach((row, i) => {
          gsap.fromTo(
            row,
            { x: -40, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.8,
              delay: i * 0.05,
              ease: "power3.out",
              scrollTrigger: {
                trigger: row,
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            },
          )
        })
      }

      // Light up each step's number + marker once the progress fill crosses
      // it. Triggered at "top 55%" of viewport so it lights as the user is
      // actively reading the row, not just when it enters.
      markerRefs.current.forEach((marker, i) => {
        const num = numberRefs.current[i]
        if (!marker || !num) return
        ScrollTrigger.create({
          trigger: marker,
          start: "top 55%",
          onEnter: () => {
            marker.classList.add("is-lit")
            num.classList.add("is-lit")
          },
          onLeaveBack: () => {
            marker.classList.remove("is-lit")
            num.classList.remove("is-lit")
          },
        })
      })

    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section id="signals" ref={sectionRef} className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12">
      {/* Section header */}
      <div ref={headerRef} className="mb-20 max-w-3xl">
        <SectionLabel>02 / How It Works</SectionLabel>
        <h2 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          STEP BY STEP
        </h2>
        <p className="mt-6 font-mono text-sm text-muted-foreground leading-relaxed max-w-xl">
          Five steps, no account required. Start with your ZIP and finish on a
          plan that actually fits your usage.
        </p>
      </div>

      {/* Vertical timeline.
          - Rail: a hairline track spanning the full height of the steps list
          - Rail progress: an overlay that scales down as the user scrolls
          - Markers: small accent squares sit on the rail at each row
          - Numbers: big Bebas figures to the left of the rail, "light up"
            once the progress fill crosses them */}
      <ol
        ref={stepsRef}
        className="relative max-w-5xl mx-auto"
      >
        {/* Rail track. Sits at left:3.5rem on mobile (steps are stacked with
            the content on the right of the rail); jumps to dead-center on
            `lg:` so content can alternate sides. */}
        <span
          aria-hidden="true"
          className="absolute left-[3.5rem] sm:left-[4.5rem] lg:left-1/2 lg:-translate-x-1/2 top-2 bottom-2 w-px bg-border/50"
        />
        {/* Rail progress — identical positioning, scrub-driven scaleY. */}
        <span
          ref={railProgressRef}
          aria-hidden="true"
          className="absolute left-[3.5rem] sm:left-[4.5rem] lg:left-1/2 lg:-translate-x-1/2 top-2 bottom-2 w-px bg-accent origin-top scale-y-0"
        />

        {signals.map((signal, index) => (
          <SignalRow
            key={index}
            signal={signal}
            index={index}
            isLast={index === signals.length - 1}
            numberRef={(el) => {
              numberRefs.current[index] = el
            }}
            markerRef={(el) => {
              markerRefs.current[index] = el
            }}
          />
        ))}
      </ol>

    </section>
  )
}


function SignalRow({
  signal,
  index,
  isLast,
  numberRef,
  markerRef,
}: {
  signal: { date: string; title: string; note: string }
  index: number
  isLast: boolean
  numberRef: (el: HTMLSpanElement | null) => void
  markerRef: (el: HTMLSpanElement | null) => void
}) {
  // Alternating sides on lg+: even-index steps on the right, odd on the
  // left. Mobile stays a single column with content to the right of the
  // rail (single-axis reading flow).
  const onRight = index % 2 === 0
  return (
      <li className={`group relative pl-20 sm:pl-28 lg:pl-0 ${isLast ? "" : "pb-16 sm:pb-20 lg:pb-24"}`}>
        {/* Number — sits in the rail's left gutter on mobile (LI's pl-20),
            but on lg+ jumps to dead-center, ON the rail. The bg-background
            "cuts" the rail line behind the number for a clean intersection.
            Muted by default; parent flips `is-lit` when scroll progress
            crosses this row. */}
        <span
          ref={numberRef}
          className="absolute top-1 left-0 lg:left-1/2 lg:-translate-x-1/2 lg:bg-background lg:px-4 z-10 font-[var(--font-bebas)] text-4xl sm:text-5xl leading-none tabular-nums text-foreground/30 transition-colors duration-500 [&.is-lit]:text-foreground"
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Marker — outlined square ON the rail at the title baseline.
            Hidden on lg+ because the centered number itself is the visual
            marker. */}
        <span
          ref={markerRef}
          aria-hidden="true"
          className="absolute lg:hidden left-[3.5rem] sm:left-[4.5rem] top-[1.2rem] sm:top-[1.5rem] -translate-x-1/2 w-2.5 h-2.5 bg-background border border-border/70 transition-colors duration-500 [&.is-lit]:bg-accent [&.is-lit]:border-accent"
        />

        {/* Content — single-column on mobile, alternating side on lg+.
            Width capped to ~40% per side with breathing room for the rail. */}
        <div
          className={`pt-1 lg:max-w-[42%] ${
            onRight ? "lg:ml-[58%]" : "lg:mr-[58%] lg:text-right"
          }`}
        >
          {/* Eyebrow + hairline. Reversed when right-aligned so the line
              sits on the correct side of the label. */}
          <div
            className={`flex items-baseline gap-3 mb-2 ${
              !onRight ? "lg:flex-row-reverse" : ""
            }`}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
              {signal.date}
            </span>
            <span aria-hidden="true" className="flex-1 h-px bg-border/40 max-w-[120px]" />
          </div>
          {/* Title row. On right-aligned steps, justify-end to keep the
              arrow (for step 1) on the inside edge nearest the rail. */}
          <div
            className={`flex items-baseline flex-wrap gap-x-4 gap-y-2 mb-3 ${
              !onRight ? "lg:justify-end" : ""
            }`}
          >
            <h3 className="font-[var(--font-bebas)] text-3xl sm:text-4xl tracking-tight leading-none">
              {signal.title.toUpperCase()}
            </h3>
            {index === 0 && (
              <a
                href="#hero"
                onClick={() => {
                  setTimeout(() => {
                    document.getElementById("hero-zip-input")?.focus();
                  }, 600);
                }}
                aria-label="Jump to ZIP entry"
                className="group/jump inline-flex items-center justify-center text-accent/80 hover:text-accent transition-colors"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="transition-transform duration-200 group-hover/jump:translate-x-1"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            )}
          </div>
          <p className="font-mono text-sm text-muted-foreground leading-relaxed">
            {signal.note}
          </p>
        </div>
      </li>
    )
}
