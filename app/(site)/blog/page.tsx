import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Texergy AI",
  description: "Field notes on the Texas electricity market.",
};

const UPCOMING = [
  {
    title: "How to read an Electricity Facts Label without falling asleep",
    body: "Bill credits, average prices, base fees, TDU pass-throughs — what each line on the EFL actually means and which ones quietly inflate your real cost.",
  },
  {
    title: "Why the cheapest headline rate is almost never the cheapest plan",
    body: "A walkthrough of three real plans where the lowest 'cents per kWh' figure ends up costing more annually than the second- or third-cheapest.",
  },
  {
    title: "ERCOT 101 for new Texans",
    body: "What 'deregulated' means, what your TDU does (vs. your retail provider), and what happens when something goes wrong with your power.",
  },
  {
    title: "Variable vs. fixed rate plans: when each one actually wins",
    body: "Variable rates aren't always the trap they're made out to be — and fixed isn't always safer than it looks. A practical decision tree.",
  },
];

export default function BlogPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          Blog
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          FIELD NOTES FROM THE TEXAS GRID.
        </h1>
        <p className="mt-6 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
          Plain-English writing about retail electricity, ERCOT, and how to stop
          overpaying for your bill. First post drops alongside early access —
          these are the topics in the queue.
        </p>
      </header>

      <div className="grid gap-px bg-border/30">
        {UPCOMING.map((post, i) => (
          <article
            key={post.title}
            className="group relative bg-background border border-transparent hover:border-accent/40 p-6 md:p-8 transition-colors duration-300"
          >
            <div className="flex items-baseline justify-between mb-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                No. {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                Coming soon
              </span>
            </div>
            <h2 className="font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight text-foreground group-hover:text-accent transition-colors duration-300 mb-3 leading-none">
              {post.title}
            </h2>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {post.body}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-20 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-6">
          Want these in your inbox the moment they go live?
        </p>
        <a
          href="/#waitlist"
          className="inline-flex items-center gap-3 border border-foreground/20 bg-accent text-accent-foreground px-6 py-3 font-mono text-xs uppercase tracking-widest hover:border-accent transition-colors duration-200"
        >
          Join the Waitlist
        </a>
      </div>
    </article>
  );
}
