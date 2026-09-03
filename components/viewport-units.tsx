"use client"

import { useEffect } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

// The same URL-bar collapse that the height freeze below guards against also
// makes ScrollTrigger recalculate every start/end mid-scroll. This is GSAP's
// own switch for it, and it only affects touch devices.
ScrollTrigger.config({ ignoreMobileResize: true })

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
 * does).
 *
 * Height is deliberately frozen between width changes on touch devices. iOS and
 * Android resize the layout viewport by 60-100px as the URL bar collapses on
 * scroll, and again when the software keyboard opens. Everything in the hero
 * keyed to `--vph` — the ZIP card's padding and row gaps, the input's height,
 * the wordmark — would then grow and shrink under the user's finger, which
 * reads as the card's fields drifting apart and back together as you scroll.
 * Re-reading height only when width changes (an orientation change, or a real
 * resize) is the stable `svh` behaviour the hero was written against. Devices
 * with a real pointer keep tracking height live, where dragging a window edge
 * vertically is deliberate and should reflow.
 */
export function ViewportUnits() {
  useEffect(() => {
    const root = document.documentElement
    let frame = 0
    let lastW = -1
    let lastH = -1

    const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches

    // `force` bypasses the touch height freeze. It is passed only by the
    // discrete signals — orientation change, page restore, tab becoming
    // visible, fonts settling — which never fire mid-scroll, so a touch device
    // whose first layout was wrong can still be corrected without the URL bar
    // being able to reintroduce the reflow.
    const measure = (force = false) => {
      const w = root.clientWidth
      const h = root.clientHeight

      // A zero measurement means the tab still has no size. Leave the CSS
      // fallback in place and wait for the next event rather than writing a
      // collapsed value we'd have to undo.
      if (w === 0 || h === 0) return false

      const widthChanged = w !== lastW
      const heightChanged = h !== lastH
      if (!widthChanged && !heightChanged) return true

      // Once a touch device has a height, only a width change earns a new one.
      // The first measurement still lands, so the hero is sized correctly on
      // load and after the rotate/restore cases this component exists for.
      if (isTouch && !widthChanged && !force && lastH !== -1) return true

      lastW = w
      lastH = h
      root.style.setProperty("--vpw", `${w / 100}px`)
      root.style.setProperty("--vph", `${h / 100}px`)
      // Any size change invalidates the scroll positions ScrollTrigger
      // cached when it was created.
      ScrollTrigger.refresh()
      return true
    }

    // If we're still reading zero, keep trying for a couple of seconds. The
    // events below cover every case we know of, but a tab that is never
    // resized and never hidden would otherwise sit on the CSS fallback
    // forever, and that fallback is exactly what's unreliable here.
    let retries = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const sync = (force = false) => {
      cancelAnimationFrame(frame)
      // One frame late, so we measure after the browser has settled the layout
      // this event was signalling.
      frame = requestAnimationFrame(() => {
        if (!measure(force) && retries < 20) {
          retries++
          clearTimeout(retryTimer)
          retryTimer = setTimeout(() => sync(force), 100)
        }
      })
    }

    // Both wrappers swallow the event argument: passing `sync` straight to
    // addEventListener would hand the Event object in as `force`, which is
    // truthy and would defeat the freeze entirely. They are also stable
    // references, so the removals in the cleanup actually match.
    const syncForced = () => sync(true)
    const syncPassive = () => sync(false)

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        retries = 0
        syncForced()
      }
    }

    measure()
    sync()

    // Web fonts change content height, which moves every ScrollTrigger start/end.
    document.fonts?.ready.then(() => syncForced()).catch(() => {})

    // Primary signal. A `resize` event is not guaranteed to reach the page when
    // a tab is finally given its real size, but the root element's layout box
    // provably changed, so the observer fires. The window events below are
    // belt-and-braces, and cover viewport height changes (which don't alter the
    // root's box, since its height is content-driven).
    const observer = new ResizeObserver(syncPassive)
    observer.observe(root)

    window.addEventListener("resize", syncPassive)
    window.addEventListener("orientationchange", syncForced)
    window.addEventListener("pageshow", syncForced)
    window.visualViewport?.addEventListener("resize", syncPassive)
    document.addEventListener("visibilitychange", onVisibility)

    // A prerendered page lays out in a hidden renderer; activation is the first
    // moment its viewport is real.
    if ((document as Document & { prerendering?: boolean }).prerendering) {
      document.addEventListener("prerenderingchange", syncForced, { once: true })
    }

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(retryTimer)
      observer.disconnect()
      window.visualViewport?.removeEventListener("resize", syncPassive)
      window.removeEventListener("resize", syncPassive)
      window.removeEventListener("orientationchange", syncForced)
      window.removeEventListener("pageshow", syncForced)
      document.removeEventListener("visibilitychange", onVisibility)
      document.removeEventListener("prerenderingchange", syncForced)
    }
  }, [])

  return null
}
