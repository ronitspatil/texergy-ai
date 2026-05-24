import type { MetadataRoute } from "next";

const BASE = "https://texergy.ai";

// Canonical, user-facing routes only. Legal/utility pages (privacy, terms,
// disclaimer, unsubscribe) are noindexed and intentionally excluded — they
// shouldn't compete for sitelink slots on brand queries.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/texas-energy-101`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/service-areas`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/electricity-providers`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/electric-utilities`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];
}
