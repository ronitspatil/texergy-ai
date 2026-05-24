import type { Metadata } from "next";
import { SavingsCalculator } from "@/components/savings-calculator/savings-calculator";

export const metadata: Metadata = {
  title: "Savings Calculator",
  description:
    "Enter your most recent Texas electricity bill and see how much you could save by switching to the best available plan in your ZIP. Monthly bill, annual savings, and savings percentage in one shot.",
};

export default function SavingsCalculatorPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Savings Calculator
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          HOW MUCH ARE YOU OVERPAYING?
        </h1>
        <p className="mt-6 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
          Grab your most recent electricity bill. Plug in your ZIP, how much you
          paid, and how many kWh you used. We&apos;ll compare it to the best plan
          currently available at your address and show you a 12-month savings
          projection — no signup, no email gate.
        </p>
      </header>

      <SavingsCalculator />

      <section className="mt-24 border-t border-border/30 pt-12">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          How it works
        </span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight leading-none">
          THE SHORT VERSION.
        </h2>
        <ol className="mt-8 space-y-6">
          <li className="border-l-2 border-accent pl-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              01 / Match
            </div>
            <p className="mt-2 font-mono text-sm text-foreground/80 leading-relaxed max-w-2xl">
              Your ZIP determines which TDU (utility) covers your address, which
              in turn determines which retail plans you&apos;re eligible to enroll
              in. We pull every active plan in your TDU.
            </p>
          </li>
          <li className="border-l-2 border-accent pl-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              02 / Simulate
            </div>
            <p className="mt-2 font-mono text-sm text-foreground/80 leading-relaxed max-w-2xl">
              For every eligible plan we run a full bill simulation at your
              actual usage — base charges, energy charge, TDU pass-through, bill
              credits, minimum-usage fees. Not a teaser rate, the all-in cost.
            </p>
          </li>
          <li className="border-l-2 border-accent pl-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              03 / Compare
            </div>
            <p className="mt-2 font-mono text-sm text-foreground/80 leading-relaxed max-w-2xl">
              We rank the simulations by cost and show you the difference
              between what you paid this month and what the cheapest available
              plan would have cost at the same usage. Annual savings assumes
              your usage holds steady — actual savings vary with weather.
            </p>
          </li>
        </ol>
      </section>
    </article>
  );
}
