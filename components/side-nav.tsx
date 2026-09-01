"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const navItems = [
  { id: "hero", label: "Home" },
  { id: "signals", label: "How It Works" },
  { id: "work", label: "Smart Match" },
]

const resourceLinks = [
  { href: "/texas-energy-101", label: "Texas Energy 101" },
  { href: "/savings-calculator", label: "Savings Calculator" },
  { href: "/usage-calculator", label: "Usage Calculator" },
  { href: "/esid-lookup", label: "ESID Lookup" },
]

function NavDropdown({
  label,
  links,
  activePath,
}: {
  label: string
  links: Array<{ href: string; label: string }>
  activePath?: string
}) {
  const [open, setOpen] = useState(false)
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLLIElement | null>(null)

  const openMenu = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current)
    setOpen(true)
  }

  const closeMenu = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current)
    closeTimeout.current = setTimeout(() => setOpen(false), 120)
  }

  // Touch has no pointer to move away, so onMouseLeave never fires and the menu
  // would have no way to close. This is the only dropdown left in the nav and
  // the sole route to Resources on a phone, so it needs both dismissals.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <li ref={rootRef} className="relative" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex items-center gap-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.06em] sm:tracking-[0.22em] px-1.5 sm:px-2.5 py-1.5 transition-colors whitespace-nowrap",
          open ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden="true"
          className={cn("transition-transform", open && "rotate-180")}
        >
          <path
            d="M1.5 3 4 5.5 6.5 3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {/* Panel is centred under the trigger where there is room, but
          right-anchored on a phone: the trigger sits near the end of the nav
          pill, so centring a 208px panel there ran it past the viewport edge. */}
      {open && (
        <div className="absolute top-full right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 pt-4 md:pt-6">
          <ul className="w-max min-w-52 md:min-w-56 max-w-[calc(var(--vpw)*100-24px)] rounded-[10px] border border-border/50 bg-background/95 backdrop-blur-md shadow-e2 py-2 md:py-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            {links.map(({ href, label: linkLabel }, index) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="group/item flex items-baseline gap-3 px-4 py-2.5 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.06em] sm:tracking-[0.18em] text-muted-foreground hover:text-foreground hover:bg-accent/[0.06] transition-colors whitespace-nowrap"
                >
                  <span className="text-[9px] text-accent/60 tabular-nums group-hover/item:text-accent transition-colors">
                    0{index + 1}
                  </span>
                  <span className="flex-1">{linkLabel}</span>
                  <span
                    aria-hidden="true"
                    className="text-accent opacity-0 -translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-150"
                  >
                    &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

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
      className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 flex w-max max-w-[calc(100vw-16px)] items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 border border-border/40 bg-background/80 backdrop-blur-md shadow-sm"
    >
      <button
        type="button"
        onClick={() => scrollToSection("hero")}
        aria-label="Texergy home"
        className="shrink-0 hover:opacity-80 transition-opacity"
      >
        <img src="/logo.svg" alt="Texergy" className="block w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <span aria-hidden="true" className="h-5 w-px bg-border/60" />

      {/* Section links and Resources, all visible at every width. */}
      <ul className="flex min-w-0 items-center gap-0 sm:gap-1 md:gap-1.5 lg:gap-2">
        {navItems.map(({ id, label }) => {
          const active = activeSection === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollToSection(id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "font-mono text-[9.5px] sm:text-[11px] uppercase tracking-[0.04em] sm:tracking-[0.22em] px-1.5 sm:px-2.5 py-1.5 transition-colors whitespace-nowrap",
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
        <NavDropdown
          label="Resources"
          links={resourceLinks}
          activePath={isHome ? undefined : pathname}
        />
      </ul>

    </nav>
  )
}
