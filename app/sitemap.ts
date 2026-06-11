import type { MetadataRoute } from "next";

const BASE = "https://texergy.ai";

// Homepage only, by design: the site should surface as a single result on
// brand queries. Every other page carries robots `noindex, follow` in its
// metadata, so listing them here would contradict the noindex signal.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
  ];
}
