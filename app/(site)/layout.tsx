import Link from "next/link";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="grid-bg fixed inset-0 opacity-20" aria-hidden="true" />

      <header className="relative z-10 px-6 md:px-12 pt-8 pb-4">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="transition-transform group-hover:-translate-x-1"
          >
            <path
              d="M8.5 2.5 4 7l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Texergy AI
        </Link>
      </header>

      <div className="relative z-10 pt-12 sm:pt-20 pb-32">{children}</div>

      <footer className="relative z-10 border-t border-border/30 px-6 md:px-12 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            © 2026 Texergy AI
          </p>
          <div className="flex flex-wrap gap-6">
            <Link
              href="/privacy"
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/blog"
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors"
            >
              Blog
            </Link>
            <a
              href="mailto:hello@texergy.ai"
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
