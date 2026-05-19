"use client"

import { useEffect, useRef } from "react"
import { ScrambleTextOnHover } from "@/components/scramble-text"
import { SplitFlapText, SplitFlapMuteToggle, SplitFlapAudioProvider } from "@/components/split-flap-text"
import { AnimatedNoise } from "@/components/animated-noise"
import { BitmapChevron } from "@/components/bitmap-chevron"
import { SectionLabel } from "@/components/ui/section-label"
import { HeroZipForm } from "@/components/hero-zip-form"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const IS_PRODUCT_MODE = process.env.NEXT_PUBLIC_APP_MODE !== "waitlist"

gsap.registerPlugin(ScrollTrigger)

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return

    const ctx = gsap.context(() => {
      gsap.to(contentRef.current, {
        y: -100,
        opacity: 0,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-screen flex items-center pl-6 md:pl-28 pr-6 md:pr-12 pt-16 md:pt-20 pb-12">
      <AnimatedNoise opacity={0.03} />

      {/* Main content */}
      <div ref={contentRef} className="flex-1 w-full">
        <SectionLabel className="block mb-6">01 / Home</SectionLabel>
        <SplitFlapAudioProvider>
          <div className="relative">
            <SplitFlapText text="TEXERGYAI" speed={80} accentIndices={[7, 8]} />
            <div className="mt-4">
              <SplitFlapMuteToggle />
            </div>
          </div>
        </SplitFlapAudioProvider>

        <h2 className="font-[var(--font-bebas)] text-muted-foreground text-[clamp(1rem,3vw,2rem)] mt-4 tracking-wide">
          Stop Overpaying for Electricity. Start Shopping Smarter with AI.
        </h2>

        <p className="mt-12 max-w-xl font-mono text-[16px] text-muted-foreground leading-relaxed">
          <span className="block">
            Enter your ZIP code, share what matters to you, and Texergy AI finds the best electricity plans for residents and businesses alike.
          </span>
          <span className="mt-3 block">
            100% free + no sign up required.
          </span>
        </p>

        <div className={`flex flex-wrap items-center gap-8 ${IS_PRODUCT_MODE ? "mt-8 justify-center" : "mt-16"}`}>
          {IS_PRODUCT_MODE ? (
            <HeroZipForm />
          ) : (
            <a
              href="#waitlist"
              className="group inline-flex items-center gap-3 border border-foreground/20 px-7 py-3.5 font-mono text-sm uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-all duration-200"
            >
              <ScrambleTextOnHover text="Join Waitlist" as="span" duration={0.6} />
              <BitmapChevron className="transition-transform duration-[400ms] ease-in-out group-hover:rotate-45" />
            </a>
          )}
          {!IS_PRODUCT_MODE && (
            <a
              href="#signals"
              className="font-mono text-sm uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              How It Works
            </a>
          )}
        </div>
      </div>

    </section>
  )
}
