"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

const IS_PRODUCT_MODE = process.env.NEXT_PUBLIC_APP_MODE !== "waitlist"

const navItems = [
  { id: "hero", label: "Home" },
  { id: "signals", label: "How It Works" },
  { id: "work", label: "Variables" },
  { id: "principles", label: "Why Us" },
  ...(IS_PRODUCT_MODE
    ? []
    : [{ id: "waitlist", label: "Early Access" }]),
  { id: "faq", label: "FAQ" },
  ...(IS_PRODUCT_MODE ? [] : [{ id: "colophon", label: "Soon" }]),
]

export function SideNav() {
  const [activeSection, setActiveSection] = useState("hero")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.3 },
    )

    navItems.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 border border-border/40 bg-background/80 backdrop-blur-md shadow-sm"
    >
      <button
        type="button"
        onClick={() => scrollToSection("hero")}
        aria-label="Texergy home"
        className="shrink-0 hover:opacity-80 transition-opacity"
      >
        <img src="/logo.svg" alt="Texergy" className="block w-6 h-6 sm:w-7 sm:h-7" />
      </button>

      <span aria-hidden="true" className="h-5 w-px bg-border/60" />

      <ul className="flex items-center gap-1 sm:gap-2">
        {navItems.map(({ id, label }) => {
          const active = activeSection === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollToSection(id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.22em] px-2 sm:px-2.5 py-1.5 transition-colors whitespace-nowrap",
                  active
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
