import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import RefreshToHome from "@/components/RefreshToHome";
import "./globals.css";

const displayFont = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
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
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <RefreshToHome />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
