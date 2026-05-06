"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FAQS = [
  {
    q: "Will I need to create an account?",
    a: "No account required. Drop your ZIP, set your priorities, see your plans. We'll only ask for an email if you want results sent to you or saved between visits.",
  },
  {
    q: "Will Texergy AI really be free to use?",
    a: "Yes. Texergy AI will be free for shoppers to use: no subscription, no credit card, and no paywall on recommendations. If we introduce provider-facing paid listings later, those terms will be disclosed and will not affect your ranking.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We store your email and (optionally) your ZIP. That's it. We use limited anti-abuse protections, but we don't use technical identifiers to profile or market to you. We don't sell or share your information, and we don't run third-party advertising trackers on this site. See our Privacy Policy for the full breakdown.",
  },
  {
    q: "How will Texergy make money if it's free?",
    a: "For now, we're focused on getting recommendations right. Longer term, Texergy may charge providers a flat fee for verified fit-based listings, never undisclosed referral kickbacks. Rankings will stay independent of who pays us.",
  },
  {
    q: "Where do the plan prices come from?",
    a: "Power to Choose, the official Texas Public Utility Commission resource. Texergy refreshes pricing daily and normalizes the rate structures (bill credits, tiered rates, base fees, TDU pass-throughs) so you see actual cost for your usage profile, not the marketing rate.",
  },
  {
    q: "What if my ZIP isn't in a deregulated area?",
    a: "We'll tell you. About 15% of Texans are served by municipal utilities (Austin Energy, CPS Energy, San Antonio) or rural co-ops where you can't switch providers. If that's you, we'll explain why and point you to your local utility's rate sheet.",
  },
  {
    q: "Can I unsubscribe or have my data deleted?",
    a: "Anytime. Reply to any email we send, or contact hello@texergy.ai with the subject \"delete my data\" and we'll remove your record within 7 days. No friction, no retention games.",
  },
];

export function FaqSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !itemsRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        x: -60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: headerRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      const items = itemsRef.current?.querySelectorAll("details");
      if (items && items.length > 0) {
        gsap.from(items, {
          x: -40,
          opacity: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: itemsRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12 border-t border-border/30"
    >
      <div ref={headerRef} className="mb-16">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          06 / FAQ
        </span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight">
          QUESTIONS?
        </h2>
      </div>

      <div ref={itemsRef} className="max-w-3xl space-y-3">
        {FAQS.map((f, i) => (
          <details
            key={f.q}
            className="group border border-border/40 hover:border-accent/40 transition-colors duration-300 cursor-pointer"
          >
            <summary className="flex items-start justify-between gap-6 px-6 py-5 list-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-[var(--font-bebas)] text-xl md:text-2xl tracking-tight text-foreground group-hover:text-accent transition-colors">
                  {f.q}
                </h3>
              </div>
              <span
                aria-hidden
                className="shrink-0 mt-1.5 inline-flex h-5 w-5 items-center justify-center text-foreground/60 transition-transform duration-300 group-open:rotate-45"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1.5v11M1.5 7h11"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </summary>
            <div className="px-6 pb-6 pl-[calc(1.5rem+1.5ch+1rem)]">
              <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                {f.a}
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
