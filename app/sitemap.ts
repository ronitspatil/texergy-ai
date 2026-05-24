import type { MetadataRoute } from "next";

const BASE = "https://texergy.ai";

// Canonical, user-facing routes only. Legal/utility pages (privacy, terms,
// disclaimer, unsubscribe) are noindexed and intentionally excluded — they
// shouldn't compete for sitelink slots on brand queries.
//
// Also intentionally excluded (these are directory-style pages that we
// noindex via per-page metadata + robots.ts disallow):
//   - /service-areas
//   - /electricity-providers
//   - /electric-utilities
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/texas-energy-101`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/savings-calculator`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/usage-calculator`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/esid-lookup`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];
}
