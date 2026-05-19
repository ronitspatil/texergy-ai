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
  title: "Texergy AI | Shop Texas Energy Smarter",
  description:
    "AI-powered electricity plan shopping for Texas residents and businesses. Enter your ZIP, set your priorities, and find the right plan in minutes. Join the waitlist today.",
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
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

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
        <div className="noise-overlay" aria-hidden="true" />
        <RefreshToHome />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
