import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Texergy AI",
  description: "What we collect, what we don't, and how to delete it.",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Privacy Policy
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          YOUR DATA, IN PLAIN ENGLISH.
        </h1>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Last updated: May 20, 2026
        </p>
      </header>

      <div className="space-y-12 text-foreground/80 leading-relaxed">
        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            What we collect
          </h2>
          <p className="font-mono text-sm mb-3">
            Using Texergy AI does not require an account. To match you with
            electricity plans, the site asks for your ZIP code so it can look
            up the providers that serve your area. Your other wizard answers
            (estimated monthly usage, household profile, weight preferences)
            stay in your browser session and are sent to our server only when
            we generate ranked recommendations for you.
          </p>
          <p className="font-mono text-sm mb-3">
            If you choose the &ldquo;Upload Meter Data&rdquo; option, your{" "}
            <em>IntervalData.csv</em> file from Smart Meter Texas is parsed
            entirely in your browser. We never upload, store, or transmit the
            raw file. Only the resulting monthly average kWh leaves your
            browser, and only so we can rank plans against it.
          </p>
          <p className="font-mono text-sm mb-3">
            If you ask a question in the &ldquo;Ask Texergy Bot&rdquo; feature
            on the comparison page, your question plus a brief summary of the
            plans you&apos;re comparing are sent to Google&apos;s Gemini API to
            generate a response. We don&apos;t retain the content of those
            conversations on our servers.
          </p>
          <p className="font-mono text-sm">
            If you subscribe to our newsletter or contact us by email, we store
            the email address you used and whatever you wrote.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            What we don&apos;t collect
          </h2>
          <ul className="list-disc list-outside ml-5 space-y-3 marker:text-accent/60 font-mono text-sm">
            <li>
              <strong className="text-foreground">No account, no login, no profile.</strong>{" "}
              The site works without identifying you.
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
            <li>
              <strong className="text-foreground">No raw meter data on our servers.</strong>{" "}
              Smart Meter Texas CSV files are parsed in your browser and
              discarded when you close the tab.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            How we use what we collect
          </h2>
          <p className="font-mono text-sm mb-3">
            Your ZIP code is used to identify the utility delivering power to
            your area and to look up the retail plans available there. Your
            usage estimate (or parsed meter average) is used to rank plans by
            real expected cost rather than a marketing rate.
          </p>
          <p className="font-mono text-sm mb-3">
            If you subscribe to the newsletter, that email is used only to send
            you the newsletter and any service-critical notices about the
            subscription itself.
          </p>
          <p className="font-mono text-sm">
            We use limited technical signals (such as a hashed and salted IP
            address) to rate-limit our APIs and protect the service from abuse.
            These signals are not used to profile or market to you.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Where it lives
          </h2>
          <p className="font-mono text-sm mb-3">
            ZIP-to-utility mappings, plan data, and (if you subscribe)
            newsletter records are stored in our Supabase database. Plan and
            utility records describe the market, not you, and are the same for
            every visitor.
          </p>
          <p className="font-mono text-sm">
            Confirmation and newsletter emails are delivered through a trusted
            transactional email provider, which receives only what&apos;s
            needed to deliver each message.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            How long we keep it
          </h2>
          <p className="font-mono text-sm">
            Newsletter subscriptions are kept until you unsubscribe, at which
            point your record is removed. Temporary anti-abuse signals (such as
            rate-limit buckets keyed by hashed IP) expire automatically within
            hours and are not retained long term. Wizard inputs you provide
            during a session are not persisted server-side once your session
            ends.
          </p>
        </section>

        <section>
          <h2 className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-4">
            Deleting your data
          </h2>
          <p className="font-mono text-sm">
            If you&apos;ve subscribed to the newsletter, you can unsubscribe at
            any time via the link in any newsletter email, or by emailing{" "}
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
            If we change something material (what we collect, who we share it
            with, how long we keep it), we&apos;ll post a notice on this page
            at least 14 days before it takes effect. Newsletter subscribers
            will also receive notice by email.
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
