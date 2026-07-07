"use client"

import { useRef, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function ColophonSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      // Grid columns fade up with stagger
      if (gridRef.current) {
        const columns = gridRef.current.querySelectorAll(":scope > div")
        gsap.from(columns, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top bottom",
            toggleActions: "play none none reverse",
          },
        })
      }

      // Footer fade in
      if (footerRef.current) {
        gsap.from(footerRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 95%",
            toggleActions: "play none none reverse",
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="colophon"
      className="relative pb-6 md:pb-8 pl-6 md:pl-28 pr-6 md:pr-12 border-t border-border/30 pt-12 md:pt-14"
    >

      {/* Multi-column layout */}
      <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-10 md:gap-x-10 lg:gap-x-6 xl:gap-x-10">

        {/* Product */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-5">Product</h4>
          <ul className="space-y-2">
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="#signals" className="hover:text-accent transition-colors duration-200">How It Works</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="#work" className="hover:text-accent transition-colors duration-200">Smart Match</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="#hero" className="hover:text-accent transition-colors duration-200">Find My Plan</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/faq" className="hover:text-accent transition-colors duration-200">FAQ</a>
            </li>
          </ul>
        </div>

        {/* Company */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-5">Texergy AI</h4>
          <ul className="space-y-2">
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/about" className="hover:text-accent transition-colors duration-200">About Texergy AI</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/blog" className="hover:text-accent transition-colors duration-200">Blog</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="mailto:ronit@texergy.ai?subject=Partnership%20with%20Texergy%20AI" className="hover:text-accent transition-colors duration-200">Partner With Us</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="mailto:hello@texergy.ai" className="hover:text-accent transition-colors duration-200">Support</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <span className="text-foreground/45">Press</span>
              <span className="ml-2 border border-border/80 px-1.5 py-[1px] text-[8px] uppercase tracking-[0.18em] text-muted-foreground/70">Soon</span>
            </li>
          </ul>
        </div>

        {/* Resources */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-5">Resources</h4>
          <ul className="space-y-2">
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="https://www.powertochoose.org" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors duration-200">Power to Choose</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="https://www.puc.texas.gov" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors duration-200">PUCT</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/texas-energy-101" className="hover:text-accent transition-colors duration-200">Texas Energy 101</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/savings-calculator" className="hover:text-accent transition-colors duration-200">Savings Calculator</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/usage-calculator" className="hover:text-accent transition-colors duration-200">Usage Calculator</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/esid-lookup" className="hover:text-accent transition-colors duration-200">ESID Lookup</a>
            </li>
          </ul>
        </div>

        {/* Shop Electricity */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-5">Shop Electricity</h4>
          <ul className="space-y-2">
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/service-areas" className="hover:text-accent transition-colors">
                Service Areas
              </a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/#hero" className="hover:text-accent transition-colors">
                Residential Plans
              </a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <span className="text-foreground/45">Commercial Plans</span>
              <span className="ml-2 border border-border/80 px-1.5 py-[1px] text-[8px] uppercase tracking-[0.18em] text-muted-foreground/70">Soon</span>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/electricity-providers" className="hover:text-accent transition-colors">
                Electricity Providers
              </a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/electric-utilities" className="hover:text-accent transition-colors">
                Electric Utilities
              </a>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-5">Legal</h4>
          <ul className="space-y-2">
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/terms" className="hover:text-accent transition-colors duration-200">Terms of Service</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/privacy" className="hover:text-accent transition-colors duration-200">Privacy Policy</a>
            </li>
            <li className="h-5 flex items-center font-mono text-xs text-foreground/80">
              <a href="/disclaimer" className="hover:text-accent transition-colors duration-200">Disclaimer</a>
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom copyright */}
      <div
        ref={footerRef}
        className="mt-12 pt-6 border-t border-border/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          © 2026 Texergy AI. All rights reserved.
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          Built to make Texas electricity shopping clearer.
        </p>
      </div>
    </section>
  )
}
