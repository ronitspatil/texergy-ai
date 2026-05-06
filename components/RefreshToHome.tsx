"use client";

import { useEffect } from "react";

/**
 * On page reload, scroll the current page back to the top.
 * - Refresh on /privacy stays on /privacy at scroll 0
 * - Refresh on /#faq stays on / with the hash cleared so it doesn't re-anchor
 * - Refresh on / mid-scroll snaps back to scroll 0 (overrides browser restoration)
 *
 * Uses PerformanceNavigationTiming to distinguish a reload from regular link
 * navigation or back/forward — internal nav is unaffected.
 */
export default function RefreshToHome() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const navEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const isReload = navEntry?.type === "reload";

    if (!isReload) return;

    // Stop the browser from restoring the previous scroll position behind our back.
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    // Clear any in-page hash so it doesn't re-anchor on reload.
    if (window.location.hash) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }

    // Force instant scroll-to-top (overrides global `scroll-behavior: smooth`).
    // Re-fire on the next frame too, in case React hydration shifts layout.
    const snap = () =>
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    snap();
    requestAnimationFrame(snap);
  }, []);

  return null;
}
