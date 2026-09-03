"use client"

import { useEffect, useRef } from "react"
import { SplitFlapText } from "@/components/split-flap-text"
import { AnimatedNoise } from "@/components/animated-noise"
import { HeroZipForm } from "@/components/hero-zip-form"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return

    // Gate the scroll-fade to desktop. On mobile, focusing the ZIP input makes
    // the browser scroll up to clear the keyboard, which would otherwise drive
    // this scrub and dim the hero mid-typing.
    const mm = gsap.matchMedia()
    mm.add("(min-width: 768px)", () => {
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
    })

    return () => mm.revert()
  }, [])

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-[calc(var(--vph)*100)] flex items-start landscape:md:items-center pl-4 md:pl-28 portrait:md:pl-16 pr-4 md:pr-12 pt-[clamp(3.25rem,calc(var(--vph)*8),6.75rem)] md:pt-[clamp(4.5rem,calc(var(--vph)*8),8.5rem)] pb-[clamp(1rem,calc(var(--vph)*3),3rem)]">
      <AnimatedNoise opacity={0.03} />

      <div ref={contentRef} className="flex-1 w-full flex flex-col landscape:md:block self-stretch landscape:md:self-auto">
        <SplitFlapText text="TEXERGYAI" speed={80} accentIndices={[7, 8]} size="var(--hero-flap)" />

        <h2 className="font-sans font-medium text-foreground/70 text-[clamp(1.25rem,min(calc(var(--vpw)*5.5),calc(var(--vph)*3.4)),1.85rem)] portrait:md:text-[clamp(1.5rem,calc(var(--vph)*2.9),2.25rem)] landscape:md:text-[clamp(1.05rem,min(calc(var(--vpw)*3.5),calc(var(--vph)*3.4)),1.85rem)] mt-[clamp(1.25rem,calc(var(--vph)*4.5),3.5rem)] portrait:md:mt-[clamp(1.5rem,calc(var(--vph)*4.5),3.5rem)] landscape:md:mt-[clamp(0.75rem,calc(var(--vph)*2.4),2rem)] tracking-tight leading-snug max-w-2xl text-balance">
          Stop Overpaying for Electricity. Shop Smarter with Texergy.
        </h2>

        <p className="mt-[clamp(0.75rem,calc(var(--vph)*2.5),2rem)] landscape:md:mt-[clamp(0.75rem,calc(var(--vph)*3),2.5rem)] max-w-xl font-mono text-[clamp(0.75rem,min(calc(var(--vpw)*3.4),calc(var(--vph)*2.4)),0.875rem)] portrait:md:text-[clamp(0.9375rem,calc(var(--vph)*1.9),1.125rem)] landscape:md:text-[clamp(0.8125rem,calc(var(--vph)*1.9),1rem)] text-muted-foreground leading-relaxed">
          <span className="block">
            Enter your ZIP code, share what matters to you, and Texergy finds the best electricity plans for residents and businesses alike.
          </span>
          <span className="mt-[clamp(0.375rem,calc(var(--vph)*1.4),0.75rem)] portrait:md:mt-[clamp(0.5rem,calc(var(--vph)*1.6),1rem)] block">
            100% free + no sign up required.
          </span>
        </p>

        <div className="mt-auto mb-[clamp(2.5rem,calc(var(--vph)*10),7rem)] landscape:md:mt-[clamp(2rem,calc(var(--vph)*6.2),5rem)] landscape:md:mb-0">
          <HeroZipForm />
        </div>
      </div>
    </section>
  )
}
