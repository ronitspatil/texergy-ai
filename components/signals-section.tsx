"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    label: "START",
    title: "Enter ZIP",
    note: "Tell us your Texas ZIP so Texergy only compares plans actually available in your service area. One keystroke — nothing leaves the page, no account required.",
  },
  {
    label: "DETAILS",
    title: "Add Basics",
    note: "Share your typical monthly usage and a rough sense of your bill. The more honest the inputs, the closer the projection matches what you'll actually pay.",
  },
  {
    label: "WEIGHTS",
    title: "Tune Fit",
    note: "Pick what matters: lowest rate, renewable mix, no termination fee, fixed term. Slide each weight to bias the engine toward what you actually care about.",
  },
  {
    label: "MATCHES",
    title: "Review Plans",
    note: "See the top plans ranked against your profile, with the math behind each ranking surfaced openly. Compare side-by-side and chat through tradeoffs before deciding.",
  },
  {
    label: "BUY",
    title: "Sign Up",
    note: "When a plan looks right, click through to the provider to enroll directly. Texergy hands you off cleanly — no upsells, no email captures, no middleman.",
  },
]

// Sun-ray animation: each ray scales out from the node center (26,26 in the 52×52 viewBox).
const NODE_STYLES = `
  .ray {
    transform-box: view-box;
    transform-origin: 26px 26px;
    opacity: 0;
    transform: scale(0.1);
    transition: opacity 0.35s ease, transform 0.5s cubic-bezier(0.34, 1.45, 0.64, 1);
  }
  .ray.is-lit { opacity: 1; transform: scale(1); }
  @media (prefers-reduced-motion: reduce) {
    .ray { transition: opacity 0.1s; transform: scale(1) !important; }
  }
`

export function SignalsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLOListElement>(null)
  const trackRef = useRef<HTMLSpanElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  const [lit, setLit] = useState<boolean[]>(Array(steps.length).fill(false))

  // Set wire top/height so it runs exactly from first node center to last node center.
  // Called on mount and on resize — keeps the wire endpoints accurate at any viewport.
  const measureWire = useCallback(() => {
    const first = nodeRefs.current[0]
    const last = nodeRefs.current[steps.length - 1]
    if (!stepsRef.current || !first || !last) return
    const olRect = stepsRef.current.getBoundingClientRect()
    const firstRect = first.getBoundingClientRect()
    const lastRect = last.getBoundingClientRect()
    const top = firstRect.top + firstRect.height / 2 - olRect.top
    const height = lastRect.top + lastRect.height / 2 - olRect.top - top
    ;[trackRef, fillRef].forEach((ref) => {
      if (!ref.current) return
      ref.current.style.top = `${top}px`
      ref.current.style.height = `${height}px`
    })
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(measureWire)
    const ro = new ResizeObserver(measureWire)
    if (stepsRef.current) ro.observe(stepsRef.current)
    window.addEventListener("resize", measureWire)
    return () => {
      cancelAnimationFrame(id)
      ro.disconnect()
      window.removeEventListener("resize", measureWire)
    }
  }, [measureWire])

  // Wire fill: scroll-scrubbed scaleY 0 → 1, origin top
  useEffect(() => {
    if (!fillRef.current || !stepsRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        fillRef.current,
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
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  // Light each node when it crosses 62% viewport; reverse on scroll-back
  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      nodeRefs.current.forEach((node, i) => {
        if (!node) return
        ScrollTrigger.create({
          trigger: node,
          start: "top 62%",
          onEnter: () =>
            setLit((prev) => { const n = [...prev]; n[i] = true; return n }),
          onLeaveBack: () =>
            setLit((prev) => { const n = [...prev]; n[i] = false; return n }),
        })
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  // Header entrance
  useEffect(() => {
    if (!headerRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { x: -60, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 1, ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  // Row slide-in
  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      stepsRef.current?.querySelectorAll("li").forEach((li, i) => {
        gsap.fromTo(
          li,
          { x: -32, opacity: 0 },
          {
            x: 0, opacity: 1, duration: 0.7, delay: i * 0.04, ease: "power3.out",
            scrollTrigger: {
              trigger: li,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          }
        )
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section id="signals" ref={sectionRef} className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12">
      <style dangerouslySetInnerHTML={{ __html: NODE_STYLES }} />

      <div ref={headerRef} className="mb-20 max-w-3xl">
        <h2 className="font-display text-5xl md:text-7xl tracking-tight leading-none">
          STEP BY STEP
        </h2>
        <p className="mt-6 font-mono text-sm text-muted-foreground leading-relaxed max-w-xl">
          Five steps, no account required. Start with your ZIP and finish on a
          plan that actually fits your usage.
        </p>
      </div>

      <ol ref={stepsRef} className="relative max-w-5xl mx-auto">
        {/* Hairline wire track — endpoints set by measureWire to match node centers */}
        <span
          ref={trackRef}
          aria-hidden
          className="absolute left-[38px] sm:left-[44px] lg:left-1/2 w-px bg-foreground/[0.12]"
        />
        {/* Accent fill — scroll-scrubbed, same endpoints */}
        <span
          ref={fillRef}
          aria-hidden
          className="absolute left-[38px] sm:left-[44px] lg:left-1/2 w-px bg-accent origin-top scale-y-0"
        />

        {steps.map((step, index) => {
          const isLast = index === steps.length - 1
          const onRight = index % 2 === 0

          return (
            <li
              key={index}
              className={`relative pl-[84px] sm:pl-[100px] lg:pl-0 ${
                isLast ? "" : "pb-20 sm:pb-24 lg:pb-28"
              }`}
            >
              {/* Node: py-2 extends bg-background above/below the SVG so rays
                  never visually touch the wire on either side */}
              <div
                ref={(el) => { nodeRefs.current[index] = el }}
                className="absolute left-[12px] sm:left-[18px] lg:left-1/2 lg:-translate-x-1/2 top-0 z-10 bg-background py-2"
              >
                <NodeIcon number={index + 1} lit={lit[index]} />
              </div>

              {/* Content */}
              <div
                className={`pt-1 lg:max-w-[42%] ${
                  onRight ? "lg:ml-[58%]" : "lg:mr-[58%] lg:text-right"
                }`}
              >
                <div
                  className={`flex items-baseline gap-3 mb-2 ${
                    !onRight ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                    {step.label}
                  </span>
                  <span aria-hidden className="flex-1 h-px bg-border/40 max-w-[120px]" />
                </div>

                <div
                  className={`flex items-baseline flex-wrap gap-x-4 gap-y-2 mb-3 ${
                    !onRight ? "lg:justify-end" : ""
                  }`}
                >
                  <h3 className="font-display text-3xl sm:text-4xl tracking-tight leading-none">
                    {step.title.toUpperCase()}
                  </h3>
                  {index === 0 && (
                    <a
                      href="#hero"
                      onClick={() => {
                        setTimeout(
                          () => document.getElementById("hero-zip-input")?.focus(),
                          600
                        )
                      }}
                      aria-label="Jump to ZIP entry"
                      className="group/jump inline-flex items-center justify-center text-accent/80 hover:text-accent transition-colors"
                    >
                      <svg
                        width="22" height="22" viewBox="0 0 24 24" fill="none"
                        className="transition-transform duration-200 group-hover/jump:translate-x-1"
                        aria-hidden
                      >
                        <path
                          d="M5 12h14M13 6l6 6-6 6"
                          stroke="currentColor" strokeWidth="1.6"
                          strokeLinecap="round" strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  )}
                </div>

                <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                  {step.note}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// NODE ICON
// Top-down circular bulb: thin-stroke circle with step number at rest.
// On light-up: circle fills accent, number inverts, 8 rays shoot outward.
// Ray animation is CSS-driven (transform-box: view-box, origin at SVG center).
// ────────────────────────────────────────────────────────────────────────────
function NodeIcon({ number, lit }: { number: number; lit: boolean }) {
  // 52×52 viewBox, center at (26,26), circle r=14 (28px diameter)
  // Rays: r1=20 (6px gap outside circle edge), r2=27 (7px ray length)
  // py-2 on the parent container gives ~8px buffer above/below so
  // the 270°/90° rays (at y≈-1 and y≈53) never visually touch the wire.
  const cx = 26, cy = 26, cr = 14
  const r1 = 20, r2 = 27

  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180
    return {
      x1: +(cx + r1 * Math.cos(a)).toFixed(2),
      y1: +(cy + r1 * Math.sin(a)).toFixed(2),
      x2: +(cx + r2 * Math.cos(a)).toFixed(2),
      y2: +(cy + r2 * Math.sin(a)).toFixed(2),
    }
  })

  return (
    <div className="relative" style={{ width: 52, height: 52 }}>
      <svg
        width="52" height="52" viewBox="0 0 52 52"
        fill="none" overflow="visible" aria-hidden
      >
        {/* Sun rays — scale from center, staggered per-ray */}
        {rays.map((ray, i) => (
          <line
            key={i}
            x1={ray.x1} y1={ray.y1}
            x2={ray.x2} y2={ray.y2}
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            className={`ray${lit ? " is-lit" : ""}`}
            style={{ transitionDelay: lit ? `${i * 28}ms` : "0ms" }}
          />
        ))}

        {/* Circle body */}
        <circle
          cx={cx} cy={cy} r={cr}
          strokeWidth="1.5"
          stroke={lit ? "var(--accent)" : "currentColor"}
          fill={lit ? "var(--accent)" : "var(--background)"}
          style={{ transition: "fill 0.4s ease, stroke 0.4s ease" }}
        />
      </svg>

      {/* Step number — HTML overlay uses the display font from the design system */}
      <span
        className="absolute inset-0 flex items-center justify-center font-display tabular-nums leading-none pointer-events-none select-none"
        style={{
          fontSize: "14px",
          paddingTop: "2px",
          color: lit ? "var(--background)" : "currentColor",
          opacity: lit ? 1 : 0.4,
          transition: "color 0.4s ease, opacity 0.4s ease",
        }}
      >
        {String(number).padStart(2, "0")}
      </span>
    </div>
  )
}
