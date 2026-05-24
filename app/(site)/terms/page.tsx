import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Texergy AI",
  description: "The rules of using Texergy AI during the beta.",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Terms of Service
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          THE AGREEMENT, KEPT SHORT.
        </h1>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Last updated: May 20, 2026
        </p>
      </header>

      <div className="space-y-12 text-foreground/80 leading-relaxed">
        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            What this is
          </h2>
          <p className="font-mono text-sm">
            Texergy AI (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a public beta
            tool that helps Texas residents shortlist retail electricity plans
            available in their service area. By using the site, you agree to
            these terms.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Plan recommendations are guidance, not advice
          </h2>
          <p className="font-mono text-sm mb-3">
            Plan rankings reflect our model&apos;s read of publicly-available
            data from{" "}
            <a
              href="https://www.powertochoose.org/"
              className="text-accent hover:underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Power to Choose
            </a>
            , normalized to estimate real cost at your usage level. They are{" "}
            <em>not</em>{" "}personalized financial advice and don&apos;t account
            for every individual circumstance (for example, unusual usage
            curves, a roommate paying half your bill, or time-shifted EV
            charging).
          </p>
          <p className="font-mono text-sm mb-3">
            The Ask Texergy Bot feature uses a third-party large language model
            (Google Gemini) to summarize and compare the plan data you provide
            it. Its output can be wrong or incomplete. Treat it as a starting
            point, not a verdict.
          </p>
          <p className="font-mono text-sm">
            You&apos;re responsible for reading the official Electricity Facts
            Label and Terms of Service from any retail provider before signing
            up.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Acceptable use
          </h2>
          <ul className="list-disc list-outside ml-5 space-y-3 marker:text-accent/60 font-mono text-sm">
            <li>Don&apos;t try to bypass abuse protections, scrape the site at scale, or interfere with other users.</li>
            <li>Don&apos;t reverse-engineer or attempt to defeat the site&apos;s security or anti-abuse systems.</li>
            <li>Don&apos;t use the Ask Texergy Bot feature to generate or extract content unrelated to electricity plan comparison.</li>
            <li>Don&apos;t use the site to send spam, abuse, or threats to anyone.</li>
          </ul>
          <p className="mt-4 font-mono text-sm">
            If you do any of these, we may revoke your access without notice.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            No account required
          </h2>
          <p className="font-mono text-sm">
            The beta works without a login or saved profile. Your wizard
            answers live in your browser session and the optional Smart Meter
            Texas CSV is parsed locally without leaving your device. If we add
            user accounts later, we&apos;ll update these terms before that
            change takes effect.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            What we own, what you own
          </h2>
          <p className="font-mono text-sm mb-3">
            The site, design, code, and ranking model are ours. The ZIP code,
            usage details, and any meter data you provide are yours. You grant
            us a limited license to use them for the purposes described in our{" "}
            <a
              href="/privacy"
              className="text-accent hover:underline underline-offset-4"
            >
              Privacy Policy
            </a>
            .
          </p>
          <p className="font-mono text-sm">
            Plan data is sourced from{" "}
            <a
              href="https://www.powertochoose.org/"
              className="text-accent hover:underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Power to Choose
            </a>{" "}
            (Texas Public Utility Commission), historical pricing context from
            the U.S. Energy Information Administration, and is the property of
            those sources and their respective providers.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Service is provided &ldquo;as is&rdquo;
          </h2>
          <p className="font-mono text-sm">
            The beta is still maturing. We don&apos;t warranty uninterrupted
            availability, accuracy of every data point, or freedom from bugs.
            You use the site at your own risk.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Changes
          </h2>
          <p className="font-mono text-sm">
            We may update these terms as the product evolves. Material changes
            will be posted on this page at least 14 days before taking effect.
            Continued use after that constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Governing law
          </h2>
          <p className="font-mono text-sm">
            These terms are governed by the laws of the State of Texas.
            Disputes go to the state or federal courts located in Collin
            County, Texas.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Contact
          </h2>
          <p className="font-mono text-sm">
            Email{" "}
            <a
              href="mailto:hello@texergy.ai"
              className="text-accent hover:underline underline-offset-4"
            >
              hello@texergy.ai
            </a>{" "}
            with anything you&apos;d like to discuss.
          </p>
        </section>
      </div>
    </article>
  );
}
