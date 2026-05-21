"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Global navigation hygiene. Three concerns:
 *
 * 1. Browser scroll restoration is disabled. Manual scroll restoration so
 *    every page load starts at scrollY=0.
 *
 * 2. On reload, clear any in-page hash so it doesn't re-anchor on
 *    refresh, and snap-to-top in case anything tries to override.
 *
 * 3. When the user navigates back to the home page, Next.js's App Router
 *    does a *client-side* soft restoration — the root layout doesn't
 *    re-mount, popstate is intercepted, and GSAP ScrollTrigger /
 *    framer-motion entrances stay burned in. Detect a transition into
 *    "/" via usePathname and force a hard reload there so every animation
 *    re-mounts cleanly.
 */
export default function RefreshToHome() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    // If Next still soft-restores the home page despite staleTimes:0,
    // force a hard reload so animations re-initialize cleanly.
    if (prev !== null && prev !== "/" && pathname === "/") {
      window.location.replace("/");
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.replace(window.location.pathname);
    };
    window.addEventListener("pageshow", onPageShow);

    const navEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const isReload = navEntry?.type === "reload";

    if (isReload) {
      if (window.location.hash) {
        history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
      const snap = () =>
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      snap();
      requestAnimationFrame(snap);
    }

    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
