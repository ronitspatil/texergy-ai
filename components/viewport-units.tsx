"use client"

import { useEffect } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

/**
 * Keeps `--vpw` / `--vph` (1% of the viewport's width / height, in px) in sync
 * with the real viewport.
 *
 * Why this exists: the hero sizes itself off the viewport (the wordmark's
 * font-size, the section's min-height, the ZIP form's padding). When Chrome
 * lays a page out before the tab has been given its real size — a background
 * tab, a prerendered navigation, a restored session — `vw` and `svh` resolve
 * against a zero or provisional viewport. Every `clamp(floor, <viewport>, cap)`
 * in the hero then collapses to its floor: the wordmark renders at 3.6rem
 * instead of ~12rem and the whole page reads as though it's at the wrong zoom.
 * Nothing re-resolves those units afterwards, which is why nudging the zoom
 * level "fixes" it — that forces the style recalc the tab never got.
 *
 * `1svh` / `1vw` stay as the CSS fallback in globals.css, so server-rendered
 * markup is correctly sized on a normal load and there's no flash. This only
 * overrides them once we've measured a real viewport, and re-measures on every
 * event that can follow a bad first layout.
 *
 * Uses clientWidth/clientHeight rather than innerWidth/innerHeight because the
 * root element's client box is the layout viewport: it excludes the classic
 * scrollbar this site opts into (so `--vpw` can't overflow the way `100vw`
 * does) and it stays stable on mobile while the URL bar collapses, which is
 * the `svh` behaviour the hero was relying on.
 */
export function ViewportUnits() {
  useEffect(() => {
    const root = document.documentElement
    let frame = 0
    let lastW = -1
    let lastH = -1

    const measure = () => {
      const w = root.clientWidth
      const h = root.clientHeight

      // A zero measurement means the tab still has no size. Leave the CSS
      // fallback in place and wait for the next event rather than writing a
      // collapsed value we'd have to undo.
      if (w === 0 || h === 0) return false

      if (w !== lastW || h !== lastH) {
        lastW = w
        lastH = h
        root.style.setProperty("--vpw", `${w / 100}px`)
        root.style.setProperty("--vph", `${h / 100}px`)
        // Any size change invalidates the scroll positions ScrollTrigger
        // cached when it was created.
        ScrollTrigger.refresh()
      }
      return true
    }

    // If we're still reading zero, keep trying for a couple of seconds. The
    // events below cover every case we know of, but a tab that is never
    // resized and never hidden would otherwise sit on the CSS fallback
    // forever, and that fallback is exactly what's unreliable here.
    let retries = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const sync = () => {
      cancelAnimationFrame(frame)
      // One frame late, so we measure after the browser has settled the layout
      // this event was signalling.
      frame = requestAnimationFrame(() => {
        if (!measure() && retries < 20) {
          retries++
          clearTimeout(retryTimer)
          retryTimer = setTimeout(sync, 100)
        }
      })
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        retries = 0
        sync()
      }
    }

    measure()
    sync()

    // Web fonts change content height, which moves every ScrollTrigger start/end.
    document.fonts?.ready.then(sync).catch(() => {})

    // Primary signal. A `resize` event is not guaranteed to reach the page when
    // a tab is finally given its real size, but the root element's layout box
    // provably changed, so the observer fires. The window events below are
    // belt-and-braces, and cover viewport height changes (which don't alter the
    // root's box, since its height is content-driven).
    const observer = new ResizeObserver(sync)
    observer.observe(root)

    window.addEventListener("resize", sync)
    window.addEventListener("orientationchange", sync)
    window.addEventListener("pageshow", sync)
    window.visualViewport?.addEventListener("resize", sync)
    document.addEventListener("visibilitychange", onVisibility)

    // A prerendered page lays out in a hidden renderer; activation is the first
    // moment its viewport is real.
    if ((document as Document & { prerendering?: boolean }).prerendering) {
      document.addEventListener("prerenderingchange", sync, { once: true })
    }

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(retryTimer)
      observer.disconnect()
      window.visualViewport?.removeEventListener("resize", sync)
      window.removeEventListener("resize", sync)
      window.removeEventListener("orientationchange", sync)
      window.removeEventListener("pageshow", sync)
      document.removeEventListener("visibilitychange", onVisibility)
      document.removeEventListener("prerenderingchange", sync)
    }
  }, [])

  return null
}
