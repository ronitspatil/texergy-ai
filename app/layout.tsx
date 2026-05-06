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
  title: "Texergy AI — Find your perfect Texas electricity plan",
  description:
    "Texergy AI uses artificial intelligence to match Texas residents with the electricity plan that fits their usage, priorities, and budget. Join the waitlist for early access.",
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
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
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
      className={`dark ${ibmPlexSans.variable} ${ibmPlexMono.variable} ${bebasNeue.variable} bg-background`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased overflow-x-hidden"
        suppressHydrationWarning
      >
        <div className="noise-overlay" aria-hidden="true" />
        <RefreshToHome />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
