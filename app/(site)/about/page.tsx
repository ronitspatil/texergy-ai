import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Texergy AI",
  description:
    "Why Texergy AI exists, what it does differently, and what we will and won't do with your data.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          About
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          WHY TEXERGY AI EXISTS.
        </h1>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Last updated: May 20, 2026
        </p>
      </header>

      <div className="space-y-12 text-foreground/80 leading-relaxed">
        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            The short version
          </h2>
          <p className="font-mono text-sm">
            Texas has a deregulated electricity market with hundreds of retail
            plans per ZIP code, and the official comparison site quotes a
            single &ldquo;average price&rdquo; at 1,000 kWh that rarely matches
            what households actually pay. Texergy AI parses every plan&apos;s
            Electricity Facts Label, normalizes the cost at your real usage,
            factors in market context, and ranks what fits your priorities.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            The problem
          </h2>
          <p className="font-mono text-sm mb-3">
            Power to Choose lists the headline rate. Electricity Facts Labels
            disclose the real one, but they&apos;re a dense 1-page PDF per plan
            and most households never read them. Bill credits create cliffs
            where a small change in usage swings your monthly bill by tens of
            dollars. &ldquo;Free nights&rdquo; plans assume usage patterns most
            people don&apos;t have. The result is that picking a plan in Texas
            is a research project, and most people pick once and stay
            overpaying for years.
          </p>
          <p className="font-mono text-sm">
            We thought a tool that did the math honestly, in front of you,
            would be useful.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            What we do differently
          </h2>
          <ul className="list-disc list-outside ml-5 space-y-3 marker:text-accent/60 font-mono text-sm">
            <li>
              <strong className="text-foreground">Real cost, not headline rate.</strong>{" "}
              We parse each plan&apos;s EFL for base charges, TDU pass-throughs,
              bill credits, and minimum-usage fees, then estimate the bill at
              your actual usage.
            </li>
            <li>
              <strong className="text-foreground">Market-anchored ranking.</strong>{" "}
              Plans are compared against the EIA Texas-residential
              trailing-12-month average, so &ldquo;cheap&rdquo; means cheap
              against the market, not just against the nearest competitor.
            </li>
            <li>
              <strong className="text-foreground">Cliff detection.</strong>{" "}
              When a plan&apos;s savings depend on hitting a usage threshold
              you might miss, we flag it.
            </li>
            <li>
              <strong className="text-foreground">Bring your own meter data.</strong>{" "}
              You can upload your Smart Meter Texas CSV and we rank against
              your real usage instead of a guess. The raw file never leaves
              your browser.
            </li>
            <li>
              <strong className="text-foreground">Side-by-side comparison plus AI explainer.</strong>{" "}
              Pin two or three plans and ask plain-English questions about the
              tradeoffs.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            How we make money
          </h2>
          <p className="font-mono text-sm mb-3">
            We don&apos;t, yet. Texergy AI is in public beta and free to use.
            When we do introduce revenue, it will not come from steering you
            toward plans that pay us more. Our ranking has to keep working for
            the user, or it stops working for the business.
          </p>
          <p className="font-mono text-sm">
            We don&apos;t sell, rent, or share your data with advertisers or
            data brokers, ever. The full detail is in our{" "}
            <a
              href="/privacy"
              className="text-accent hover:underline underline-offset-4"
            >
              Privacy Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Beta status
          </h2>
          <p className="font-mono text-sm">
            The product is live for residential ZIP codes in deregulated Texas.
            Commercial plans, contract-expiry reminders, and a few other
            features are still in development. Plan data refreshes daily from
            Power to Choose, and EFL parsing improves as we find edge cases.
            If something looks off, please tell us.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Get in touch
          </h2>
          <p className="font-mono text-sm">
            Questions, feedback, partnership ideas, or a plan we&apos;re
            ranking badly:{" "}
            <a
              href="mailto:hello@texergy.ai"
              className="text-accent hover:underline underline-offset-4"
            >
              hello@texergy.ai
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
