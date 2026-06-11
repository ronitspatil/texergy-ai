import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Bebas_Neue } from "next/font/google";
import RefreshToHome from "@/components/RefreshToHome";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
});
const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
});
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://texergy.ai"),
  title: {
    default: "Texergy AI | Shop Texas Energy Smarter",
    template: "%s | Texergy AI",
  },
  description:
    "AI-powered electricity plan shopping for Texas residents and businesses. Enter your ZIP, set your priorities, and find the right plan in minutes. Join the waitlist today.",
  applicationName: "Texergy AI",
  keywords: [
    "Texas electricity",
    "electricity plans",
    "energy AI",
    "Texergy",
    "ERCOT",
    "power to choose",
  ],
  openGraph: {
    title: "Texergy AI",
    description:
      "AI-powered electricity plan recommendations for Texas residents.",
    type: "website",
    url: "https://texergy.ai",
    siteName: "Texergy AI",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

// Tells search engines we're one entity ("Texergy AI") with a canonical site,
// logo, and primary search action — drives the brand card + sitelinks on
// Google results for "texergy" queries.
const STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://texergy.ai/#organization",
    name: "Texergy AI",
    url: "https://texergy.ai",
    logo: "https://texergy.ai/logo.svg",
    description:
      "AI-powered electricity plan recommendations for Texas residents.",
    areaServed: { "@type": "State", name: "Texas" },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://texergy.ai/#website",
    url: "https://texergy.ai",
    name: "Texergy AI",
    publisher: { "@id": "https://texergy.ai/#organization" },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://texergy.ai/?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  },
];

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`light ${ibmPlexSans.variable} ${ibmPlexMono.variable} ${bebasNeue.variable} bg-background`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased overflow-x-hidden"
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <div className="noise-overlay" aria-hidden="true" />
        <RefreshToHome />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
