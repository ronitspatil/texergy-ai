import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const metadata: Metadata = {
  title: "FAQ",
  alternates: { canonical: "/faq" },
  robots: { index: false, follow: true },
  description:
    "Answers to common questions about Texergy AI: how plan ranking works, where prices come from, data privacy, deregulated ZIP codes, switching providers, and more.",
};

const FAQS = [
  {
    q: "Do I need to create an account?",
    a: "No account required. Drop your ZIP, set your priorities, and see your plans. We'll only ask for an email if you want results sent to you or saved between visits.",
  },
  {
    q: "Is it really free?",
    a: "Yes. Texergy AI is free to use during our public beta. There's no paywall on the rankings, the comparison tools, or the AI explainer. If we introduce revenue later, it won't come from steering you toward plans that pay us more.",
  },
  {
    q: "How does Texergy AI rank plans?",
    a: "We parse each plan's Electricity Facts Label for base charges, TDU pass-throughs, bill credits, and minimum-usage fees, then estimate the actual bill at your usage. Plans are scored against the EIA Texas-residential trailing-12-month average and weighted by the priorities you set, so \"best\" means best for you, not best for whoever pays us.",
  },
  {
    q: "Where do the plan prices come from?",
    a: "Power to Choose, the official Texas Public Utility Commission resource. We refresh pricing daily and normalize the rate structures (bill credits, tiered rates, base fees, TDU pass-throughs) so you see the real cost for your usage profile, not the marketing rate.",
  },
  {
    q: "What's an Electricity Facts Label (EFL)?",
    a: "The EFL is the standardized one-page disclosure every Texas retail plan must publish. It lists the real pricing terms behind the headline rate. They're dense and most people never read them, so we read every one for you and surface what actually changes your bill.",
  },
  {
    q: "Why is the headline \"average price\" misleading?",
    a: "Power to Choose quotes a single average price at 1,000 kWh. Bill credits create cliffs where using a little more or less swings your bill by tens of dollars, and \"free nights\" plans assume usage patterns most households don't have. We model your real usage instead of a single round number.",
  },
  {
    q: "Can I use my own usage data?",
    a: "Yes. You can upload your Smart Meter Texas CSV and we'll rank plans against your actual month-by-month usage instead of an estimate. The raw file is processed in your browser and never leaves your device.",
  },
  {
    q: "What if my ZIP isn't in a deregulated area?",
    a: "We'll tell you right away. About 15% of Texans are served by municipal utilities (Austin Energy, CPS Energy) or rural co-ops where you can't choose your provider. If that's you, we'll explain why and point you to your local utility's rate sheet.",
  },
  {
    q: "How do I actually switch once I pick a plan?",
    a: "You sign up directly with the retail provider you choose. There's no deposit to switch in most cases, no service interruption, and your wires company (the TDU) stays the same. We hand you the plan details so you can enroll with confidence.",
  },
  {
    q: "What about early termination fees?",
    a: "Many fixed-rate plans charge an early termination fee if you leave before the contract ends. We surface the ETF for each plan so you can weigh it, and you can filter it out entirely if a no-ETF plan matters to you.",
  },
  {
    q: "Do you cover commercial or business plans?",
    a: "Residential plans are live today. Commercial plans are in development. If you run a business and want early access, reach out at hello@texergy.ai and we'll keep you posted.",
  },
  {
    q: "How current is the data?",
    a: "Plan pricing refreshes daily from Power to Choose, and our EFL parsing improves continuously as we catch edge cases. If a plan looks mispriced or off, tell us and we'll dig in.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We store your email and, optionally, your ZIP. That's it. We use limited anti-abuse protections but don't profile you with technical identifiers, don't sell or share your information, and don't run third-party advertising trackers. See our Privacy Policy for the full breakdown.",
  },
  {
    q: "Can I unsubscribe or delete my data?",
    a: "Anytime. Reply to any email we send, or contact hello@texergy.ai with the subject \"delete my data\" and we'll remove your record within 7 days. No friction, no retention games.",
  },
];

function ContactCard({
  label,
  heading,
  body,
  email,
}: {
  label: string;
  heading: string;
  body: string;
  email: string;
}) {
  return (
    <aside className="border border-border/40 px-6 py-6 bg-background/40 backdrop-blur-sm">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
        {label}
      </span>
      <h3 className="mt-3 font-display text-2xl md:text-3xl tracking-tight leading-[0.95]">
        {heading}
      </h3>
      <p className="mt-3 font-mono text-sm text-muted-foreground leading-relaxed">{body}</p>
      <a
        href={`mailto:${email}`}
        className="mt-4 inline-flex items-center gap-2 font-mono text-sm text-foreground hover:text-accent transition-colors border-b border-border/60 hover:border-accent pb-0.5"
      >
        {email}
        <span aria-hidden>→</span>
      </a>
    </aside>
  );
}

export default function FaqPage() {
  return (
    <article className="mx-auto max-w-5xl px-6 md:px-12">
      <BreadcrumbJsonLd name="FAQ" path="/faq" />
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          FAQ
        </span>
        <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight leading-none">
          QUESTIONS? ANSWERED.
        </h1>
        <p className="mt-6 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
          Everything worth knowing about how Texergy AI finds you a better
          electricity plan. Still stuck on something? We&apos;re a reply away.
        </p>
      </header>

      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <details
            key={f.q}
            // `name` makes <details> mutually exclusive within the group
            // (HTML5 accordion semantics, no JS required). Opening one
            // automatically closes any other with the same name.
            name="faq-accordion"
            className="group border border-border/40 hover:border-accent/40 transition-colors duration-300"
          >
            <summary className="flex cursor-pointer items-start justify-between gap-6 px-6 py-5 list-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-baseline gap-4">
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="font-display text-xl md:text-2xl tracking-tight text-foreground transition-colors group-hover:text-accent group-open:text-accent">
                  {f.q}
                </h2>
              </div>
              <span
                aria-hidden
                className="mt-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-foreground/60 transition-transform duration-300 group-open:rotate-45"
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
              <p className="max-w-3xl font-mono text-sm text-muted-foreground leading-relaxed">
                {f.a}
              </p>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-16 grid gap-3 sm:grid-cols-2">
        <ContactCard
          label="Still curious?"
          heading="ASK US ANYTHING."
          body="Got a question we didn't cover? Send it over and we'll get back to you."
          email="hello@texergy.ai"
        />
        <ContactCard
          label="Business"
          heading="GET IN TOUCH."
          body="Feel free to reach out to us directly for any business inquiries."
          email="ronit@texergy.ai"
        />
      </div>
    </article>
  );
}
