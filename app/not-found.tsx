import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found — Texergy AI",
  robots: { index: false },
};

/** Branded 404 — replaces the default unstyled Next.js page so dead links
 *  stay on the warm-paper editorial look and route people back into the
 *  product instead of a dead end. */
export default function NotFound() {
  return (
    <main className="relative grid-bg flex min-h-[100svh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Error · Signal Lost
      </p>

      <h1 className="mt-4 font-display text-[clamp(6rem,22vw,14rem)] leading-[0.85] tracking-tight text-foreground">
        4<span className="text-accent">0</span>4
      </h1>

      <p className="mt-6 max-w-md font-mono text-sm leading-relaxed text-muted-foreground">
        This page isn&apos;t on the grid. The address may have moved, or the
        link you followed is out of date.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="border border-accent-strong/40 bg-accent px-7 py-3 font-mono text-xs uppercase tracking-widest text-accent-foreground transition-colors duration-200 hover:bg-accent-strong hover:border-accent-strong"
        >
          Back to Home
        </Link>
        <Link
          href="/find/recommend"
          className="border border-foreground/25 px-7 py-3 font-mono text-xs uppercase tracking-widest text-foreground/85 transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          Find My Plan →
        </Link>
      </div>

      <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
        Texergy AI · Texas Electricity, Matched Smarter
      </p>
    </main>
  );
}
