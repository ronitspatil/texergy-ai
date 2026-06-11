import type { Metadata } from "next";
import { HeroSection } from "@/components/hero-section";
import { SignalsSection } from "@/components/signals-section";
import { WorkSection } from "@/components/work-section";
import { WaitlistSection } from "@/components/waitlist-section";
import { ColophonSection } from "@/components/colophon-section";
import { SideNav } from "@/components/side-nav";

// Product mode is permanent. The previous env-gated split
// (NEXT_PUBLIC_APP_MODE="waitlist") was retired once the product landing
// became the canonical experience on both texergy.ai and staging. The
// waitlist UI branches stay in the codebase so a future campaign can
// resurrect them by flipping this constant back to an env check.
const IS_PRODUCT_MODE = true;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Page() {
  return (
    <main id="top" className="relative min-h-screen overflow-x-clip">
      <SideNav />
      <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

      <div className="relative z-10">
        <HeroSection />
        <SignalsSection />
        <WorkSection />
        {!IS_PRODUCT_MODE && <WaitlistSection />}
        <ColophonSection />
      </div>
    </main>
  );
}
