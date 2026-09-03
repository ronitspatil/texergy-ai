import Link from "next/link";
import { SideNav } from "@/components/side-nav";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="grid-bg fixed inset-0 opacity-20" aria-hidden="true" />

      {/* Same floating nav as the homepage, in route mode — subpage visitors
          (often landing from search) get the full site map instead of a lone
          back link. */}
      <SideNav variant="subpage" />

      <div className="relative z-10 pt-28 sm:pt-32 pb-32">{children}</div>

      <footer className="relative z-10 border-t border-border/30 px-6 md:px-12 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            © 2026 Texergy
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
