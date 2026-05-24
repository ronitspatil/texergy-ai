import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer | Texergy AI",
  description:
    "Plan rankings on Texergy AI are informational estimates, not advice or guarantees.",
  robots: { index: false, follow: true },
};

export default function DisclaimerPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Disclaimer
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          INFORMATIONAL. NOT ADVICE.
        </h1>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Last updated: May 21, 2026
        </p>
      </header>

      <div className="space-y-12 text-foreground/80 leading-relaxed">
        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Estimates, not guarantees
          </h2>
          <p className="font-mono text-sm">
            Everything you see on Texergy AI &mdash; projected monthly bills,
            effective ¢/kWh, plan scores, factor breakdowns, reasons, and
            chatbot output &mdash; is an{" "}
            <em>estimate</em> derived from publicly-available plan data and
            modeling assumptions. Numbers will not exactly match your real
            bill from the provider.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Why estimates differ from reality
          </h2>
          <ul className="list-disc list-outside ml-5 space-y-3 marker:text-accent/60 font-mono text-sm">
            <li>
              We model monthly usage as a single kWh figure. Real bills depend
              on month-to-month variance, time-of-day patterns, weather, and
              billing-cycle alignment.
            </li>
            <li>
              Electricity Facts Label (EFL) parsing can miss or misread
              footnotes, base charges, and tiered rate language. We flag what
              we can but don&apos;t catch every detail.
            </li>
            <li>
              TDU (delivery) charges change periodically; the values we use
              may lag the current ones by a billing cycle.
            </li>
            <li>
              Bill-credit reliability is modeled probabilistically &mdash; we
              don&apos;t know your actual usage curve.
            </li>
            <li>
              Provider promotions, sign-up bonuses, and one-time fees are not
              factored in.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Not financial, legal, or energy-advisory advice
          </h2>
          <p className="font-mono text-sm">
            Texergy AI is a comparison tool. We are not a licensed financial
            advisor, attorney, energy broker, or retail electric provider.
            Rankings reflect a generic scoring model applied to public data,
            not personalized advice for your household.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Verify before you sign up
          </h2>
          <p className="font-mono text-sm">
            Before enrolling in any plan, read the provider&apos;s official
            Electricity Facts Label (EFL), Terms of Service (TOS), and Your
            Rights as a Customer (YRAC) documents linked from each plan card.
            Those documents are the binding source of truth &mdash; not our
            ranking.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            No liability
          </h2>
          <p className="font-mono text-sm">
            To the maximum extent permitted by law, Texergy AI and its
            operators are not liable for any direct, indirect, incidental,
            consequential, or punitive damages arising from your use of the
            site or any decisions you make based on its output. You use the
            site at your own risk, as further described in our{" "}
            <a
              href="/terms"
              className="text-accent hover:underline underline-offset-4"
            >
              Terms of Service
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Data sources
          </h2>
          <p className="font-mono text-sm">
            Plan data comes from{" "}
            <a
              href="https://www.powertochoose.org/"
              className="text-accent hover:underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Power to Choose
            </a>{" "}
            (Texas Public Utility Commission). Historical pricing context
            comes from the U.S. Energy Information Administration. Neither
            entity endorses or is affiliated with Texergy AI.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Questions
          </h2>
          <p className="font-mono text-sm">
            Email{" "}
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
