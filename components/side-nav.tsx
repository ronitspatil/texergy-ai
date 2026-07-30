"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { id: "hero", label: "Home" },
  { id: "signals", label: "How It Works" },
  { id: "work", label: "Smart Match" },
]

// Route the homepage sections resolve to when the nav renders on a subpage.
const sectionHrefs: Record<string, string> = {
  hero: "/",
  signals: "/#signals",
  work: "/#work",
}

const resourceLinks = [
  { href: "/texas-energy-101", label: "Texas Energy 101" },
  { href: "/savings-calculator", label: "Savings Calculator" },
  { href: "/usage-calculator", label: "Usage Calculator" },
  { href: "/esid-lookup", label: "ESID Lookup" },
]

const aboutLinks = [
  { href: "/about", label: "About Us" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
]

function NavDropdown({
  label,
  links,
  className,
  activePath,
}: {
  label: string
  links: Array<{ href: string; label: string }>
  className?: string
  activePath?: string
}) {
  const [open, setOpen] = useState(false)
  const containsActive = links.some(({ href }) => href === activePath)
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openMenu = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current)
    setOpen(true)
  }

  const closeMenu = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current)
    closeTimeout.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <li className={cn("relative", className)} onMouseEnter={openMenu} onMouseLeave={closeMenu}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex items-center gap-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.01em] sm:tracking-[0.04em] px-1.5 sm:px-2.5 py-1.5 transition-colors whitespace-nowrap",
          containsActive
            ? "text-accent"
            : open
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
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
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3">
          <ul className="w-max min-w-52 rounded-[10px] border border-border/50 bg-background/95 backdrop-blur-md shadow-e2 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
            {links.map(({ href, label: linkLabel }, index) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={href === activePath ? "page" : undefined}
                  className={cn(
                    "group/item flex items-baseline gap-3 px-4 py-2.5 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.01em] sm:tracking-[0.04em] hover:bg-accent/[0.06] transition-colors whitespace-nowrap",
                    href === activePath
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground",
                  )}
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

export function SideNav({ variant = "home" }: { variant?: "home" | "subpage" }) {
  const isHome = variant === "home"
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState("hero")
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!isHome) return
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
  }, [isHome])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 flex w-max max-w-[calc(var(--vpw)*100-16px)] items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 border border-border/40 bg-background/80 backdrop-blur-md shadow-sm"
    >
      {isHome ? (
        <button
          type="button"
          onClick={() => scrollToSection("hero")}
          aria-label="Texergy home"
          className="shrink-0 hover:opacity-80 transition-opacity"
        >
          <img src="/logo.svg" alt="Texergy" className="block w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      ) : (
        <Link
          href="/"
          aria-label="Texergy home"
          className="shrink-0 hover:opacity-80 transition-opacity"
        >
          <img src="/logo.svg" alt="Texergy" className="block w-5 h-5 sm:w-6 sm:h-6" />
        </Link>
      )}

      <span aria-hidden="true" className="hidden sm:block h-5 w-px bg-border/60" />

      {/* Section links: always visible. Resources/About become a hamburger on mobile. */}
      <ul className="flex items-center gap-0 sm:gap-2">
        {navItems.map(({ id, label }) => {
          const active = isHome && activeSection === id
          const itemClass = cn(
            "font-mono text-[9.5px] sm:text-[11px] uppercase tracking-[0.01em] sm:tracking-[0.04em] px-1.5 sm:px-2.5 py-1.5 transition-colors whitespace-nowrap",
            active
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground",
          )
          return (
            <li key={id}>
              {isHome ? (
                <button
                  type="button"
                  onClick={() => scrollToSection(id)}
                  aria-current={active ? "true" : undefined}
                  className={itemClass}
                >
                  {label}
                </button>
              ) : (
                <Link href={sectionHrefs[id] ?? "/"} className={cn(itemClass, "block")}>
                  {label}
                </Link>
              )}
            </li>
          )
        })}
        <NavDropdown
          label="Resources"
          links={resourceLinks}
          className="hidden sm:block"
          activePath={isHome ? undefined : pathname}
        />
        <NavDropdown
          label="About"
          links={aboutLinks}
          className="hidden sm:block"
          activePath={isHome ? undefined : pathname}
        />
      </ul>

      <span aria-hidden="true" className="sm:hidden h-5 w-px bg-border/60" />

      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close menu" : "More links"}
        className="sm:hidden flex flex-col justify-center items-center gap-[3px] w-5 h-5 -mr-0.5 shrink-0 text-muted-foreground"
      >
        <span
          className={cn(
            "block h-px w-3 bg-current transition-transform duration-200",
            menuOpen && "translate-y-[2px] rotate-45",
          )}
        />
        <span
          className={cn(
            "block h-px w-3 bg-current transition-transform duration-200",
            menuOpen && "-translate-y-[2px] -rotate-45",
          )}
        />
      </button>

      {menuOpen && (
        <div className="sm:hidden absolute top-full right-0 mt-2 min-w-52 border border-border/40 bg-background shadow-e2 animate-in fade-in slide-in-from-top-1 duration-150">
          {[
            { heading: "Resources", links: resourceLinks },
            { heading: "About", links: aboutLinks },
          ].map(({ heading, links }, i) => (
            <div key={heading} className={cn("py-2", i > 0 && "border-t border-border/40")}>
              <p className="px-4 pt-1.5 pb-1 font-mono text-[9px] uppercase tracking-[0.22em] text-accent/70">
                {heading}
              </p>
              <ul>
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={!isHome && href === pathname ? "page" : undefined}
                      className={cn(
                        "block font-mono text-[9.5px] uppercase tracking-[0.04em] px-4 py-2.5 transition-colors",
                        !isHome && href === pathname ? "text-accent" : "text-muted-foreground",
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </nav>
  )
}
