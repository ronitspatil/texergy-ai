import type { Metadata } from "next";
import Link from "next/link";
import { verifyToken } from "@/lib/newsletter-token";
import UnsubscribeConfirm from "@/components/UnsubscribeConfirm";

export const metadata: Metadata = {
  title: "Unsubscribe | Texergy AI",
  description: "Confirm that you'd like to unsubscribe from the Texergy AI newsletter.",
  // Don't index this URL; the token is meant for one recipient.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  let email: string | null = null;
  if (token) {
    try {
      email = verifyToken(token);
    } catch {
      email = null;
    }
  }

  return (
    <article className="mx-auto max-w-2xl px-6 md:px-12">
      <header className="mb-12">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Newsletter
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-6xl tracking-tight leading-none">
          UNSUBSCRIBE.
        </h1>
      </header>

      {email ? (
        <UnsubscribeConfirm email={email} token={token} />
      ) : (
        <div className="space-y-6">
          <p className="font-mono text-sm text-foreground/85 leading-relaxed">
            This unsubscribe link is invalid or has expired. Try clicking the
            link in a more recent email, or reply to any newsletter email and
            we&apos;ll remove you manually.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-3 border border-foreground/20 px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors duration-200"
          >
            Back to Texergy AI →
          </Link>
        </div>
      )}
    </article>
  );
}
