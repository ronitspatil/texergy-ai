import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/find/recommend"],
      },
    ],
    sitemap: "https://texergy.ai/sitemap.xml",
    host: "https://texergy.ai",
  };
}
