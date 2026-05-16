import { HeroSection } from "@/components/hero-section";
import { SignalsSection } from "@/components/signals-section";
import { WorkSection } from "@/components/work-section";
import { PrinciplesSection } from "@/components/principles-section";
import { WaitlistSection } from "@/components/waitlist-section";
import { FaqSection } from "@/components/faq-section";
import { ColophonSection } from "@/components/colophon-section";
import { SideNav } from "@/components/side-nav";

// When NEXT_PUBLIC_APP_MODE is "product" (typically only in the product
// worktree's .env.local and on Vercel staging if you want), we render the
// landing as a product site: ZIP entry on the hero, WaitlistSection hidden.
// Leave UNSET in Vercel production so visitors to texergy.ai still see the
// "Join Waitlist" landing.
const IS_PRODUCT_MODE = process.env.NEXT_PUBLIC_APP_MODE === "product";

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
