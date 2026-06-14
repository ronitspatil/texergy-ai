"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false, // handled by PostHogPageView
      capture_pageleave: true,
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
