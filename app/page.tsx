import { HeroSection } from "@/components/hero-section";
import { SignalsSection } from "@/components/signals-section";
import { WorkSection } from "@/components/work-section";
import { PrinciplesSection } from "@/components/principles-section";
import { WaitlistSection } from "@/components/waitlist-section";
import { FaqSection } from "@/components/faq-section";
import { ColophonSection } from "@/components/colophon-section";
import { SideNav } from "@/components/side-nav";

// Product is now the default. Set NEXT_PUBLIC_APP_MODE="waitlist" on the
// production deploy (texergy.ai) to fall back to the waitlist landing; staging
// and local development get the product view without any env override.
const IS_PRODUCT_MODE = process.env.NEXT_PUBLIC_APP_MODE !== "waitlist";

export default function Page() {
  return (
    <main id="top" className="relative min-h-screen overflow-x-clip">
      <SideNav />
      <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

      <div className="relative z-10">
        <HeroSection />
        <SignalsSection />
        <WorkSection />
        <PrinciplesSection />
        {!IS_PRODUCT_MODE && <WaitlistSection />}
        <FaqSection />
        <ColophonSection />
      </div>
    </main>
  );
}
