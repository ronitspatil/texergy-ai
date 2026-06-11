const BASE = "https://texergy.ai";

// BreadcrumbList structured data for interior pages. Google uses this to
// understand site hierarchy and render breadcrumb trails in search results,
// which also feeds sitelink selection on brand queries.
export function BreadcrumbJsonLd({
  name,
  path,
}: {
  name: string;
  path: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name, item: `${BASE}${path}` },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
