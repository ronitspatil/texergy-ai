import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Texergy AI",
  description: "What we collect, what we don't, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          Privacy Policy
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          YOUR DATA, IN PLAIN ENGLISH.
        </h1>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Last updated: April 27, 2026
        </p>
      </header>

      <div className="space-y-12 text-foreground/80 leading-relaxed">
        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            What we collect
          </h2>
          <p className="font-mono text-sm">
            When you join the waitlist, we store your email address and
            (optionally) your ZIP code. That&apos;s all the personal information
            we keep about you. If you contact us by email, we&apos;ll have
            whatever you wrote in that email.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            What we don&apos;t collect
          </h2>
          <ul className="list-disc list-outside ml-5 space-y-3 marker:text-accent/60 font-mono text-sm">
            <li>
              <strong className="text-foreground">No unnecessary technical identifiers.</strong>{" "}
              We use limited technical signals to protect the waitlist from
              abuse, but we do not use them to profile you or market to you.
            </li>
            <li>
              <strong className="text-foreground">No third-party trackers.</strong>{" "}
              No Google Analytics, no Facebook pixel, no advertising cookies.
            </li>
            <li>
              <strong className="text-foreground">No cross-site tracking.</strong>{" "}
              We don&apos;t sell, rent, or share your information with
              advertisers or data brokers. Ever.
            </li>
            <li>
              <strong className="text-foreground">No payment information.</strong>{" "}
              The service is free and there&apos;s no payment flow.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            How we use what we collect
          </h2>
          <p className="font-mono text-sm mb-3">
            Your email is used for two things: (1) to confirm your spot on the
            waitlist, and (2) to email you when early access opens. If we have
            your ZIP, we&apos;ll show plan options for your service area when
            the product launches.
          </p>
          <p className="font-mono text-sm">
            We don&apos;t email you about anything else without asking first. No
            newsletter, no marketing blasts, no &ldquo;we miss you&rdquo;
            re-engagement.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Where it lives
          </h2>
          <p className="font-mono text-sm">
            Your waitlist information is stored securely and only used for the
            purposes described here. Confirmation emails may be sent through a
            trusted email delivery provider, which receives only the
            information needed to deliver those messages.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            How long we keep it
          </h2>
          <p className="font-mono text-sm">
            Until you ask us to delete it, or until early access launches and
            you don&apos;t activate within 12 months — whichever comes first.
            Temporary anti-abuse signals are kept only as long as needed to
            protect the service.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Deleting your data
          </h2>
          <p className="font-mono text-sm">
            Email{" "}
            <a
              href="mailto:hello@texergy.ai?subject=Delete%20my%20data"
              className="text-accent hover:underline underline-offset-4"
            >
              hello@texergy.ai
            </a>{" "}
            with the subject &ldquo;Delete my data&rdquo; from the address you
            signed up with. We&apos;ll confirm deletion within 7 days. No
            justification needed; no friction.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Children
          </h2>
          <p className="font-mono text-sm">
            Texergy AI is not directed at children under 13 and we don&apos;t
            knowingly collect data from them. Texas electricity contracts are
            for adult account-holders.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Changes to this policy
          </h2>
          <p className="font-mono text-sm">
            If we change something material — what we collect, who we share it
            with, how long we keep it — we&apos;ll email everyone on the
            waitlist and post a notice here at least 14 days before it takes
            effect.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Contact
          </h2>
          <p className="font-mono text-sm">
            Questions about anything here:{" "}
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
