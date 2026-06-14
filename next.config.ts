import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.sentry.io${isDev ? " ws: http://localhost:* http://127.0.0.1:*" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
];

// API responses must never be cached — they contain dynamic state.
const apiHeaders = [
  ...securityHeaders,
  { key: "Cache-Control", value: "no-store, max-age=0" },
];

// Admin pages: no caching, no indexing, and especially no Referer leakage
// since the auth token rides in the URL query string.
const adminHeaders = [
  ...securityHeaders.filter((h) => h.key !== "Referrer-Policy"),
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: projectRoot },
  // Disable App Router's client-side back/forward cache. Without this, the
  // home page is restored from the router cache on browser-back, leaving
  // GSAP ScrollTrigger + framer-motion + the split-flap intro stuck in
  // their pre-navigation state (hero text invisible, hover effects dead).
  // Setting both staleTimes to 0 forces a fresh render on every nav.
  experimental: {
    staleTimes: { dynamic: 0, static: 30 },
  },
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
  async headers() {
    // Next.js merges header rules across matching patterns; for duplicate
    // header names the *later* rule wins. So put the most-general rule
    // first and progressively more-specific ones afterwards, allowing
    // /admin and /api to override the site-wide defaults.
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: apiHeaders },
      { source: "/admin/:path*", headers: adminHeaders },
    ];
  },
};

export default nextConfig;
