import type { Metadata } from "next";
import Link from "next/link";
import { UsageCalculator } from "@/components/usage-calculator/usage-calculator";

export const metadata: Metadata = {
  title: "Usage Calculator",
  description:
    "Estimate your monthly Texas electricity usage in kWh by appliance. Pick your devices, set hours per day, and get a household total plus a bill estimate — then use the result to find a plan that actually fits.",
};

export default function UsageCalculatorPage() {
  return (
    <article className="mx-auto max-w-5xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Usage Calculator
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          HOW MANY KWH DOES YOUR HOME USE?
        </h1>
        <p className="mt-6 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
          Five quick questions, no appliance tedium, no signup. We&apos;ll
          estimate your monthly kWh and bill from the things that actually
          move the number — home size, occupants, AC, heat, and the big
          add-ons — then hand you a number you can use with the plan finder.
        </p>
      </header>

      <UsageCalculator />

      {/* Explainer sections */}
      <section className="mt-24 border-t border-border/30 pt-12">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          01 / Background
        </span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight leading-none">
          WHAT IS A KILOWATT-HOUR?
        </h2>
        <div className="mt-8 grid md:grid-cols-2 gap-10">
          <p className="font-mono text-sm text-foreground/80 leading-relaxed">
            A kilowatt-hour (kWh) is a unit of energy equal to running 1,000
            watts for one hour. A 1,000-watt microwave on for 60 minutes
            consumes one kWh. Your bill is your total monthly kWh multiplied by
            your plan&apos;s effective rate (cents per kWh), plus base fees and
            TDU delivery charges.
          </p>
          <p className="font-mono text-sm text-foreground/80 leading-relaxed">
            The catch: Texas retail plans quote different &ldquo;average&rdquo;
            rates at 500, 1,000, and 2,000 kWh, and bill credits often kick in
            only at specific thresholds. A plan that&apos;s cheapest at 1,000
            kWh can be the most expensive at 800 kWh. Knowing your actual
            number is the difference between a smart pick and a regrettable
            one.
          </p>
        </div>
      </section>

      <section className="mt-20 border-t border-border/30 pt-12">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          02 / Where you stand
        </span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight leading-none">
          IS YOUR USAGE LOW, AVERAGE, OR HIGH?
        </h2>
        <div className="mt-10 border border-border/40 rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_1fr_1.2fr_2fr] gap-4 px-5 py-3 border-b border-border/40 bg-background/40 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <div>Bucket</div>
            <div>kWh / day</div>
            <div>Monthly kWh</div>
            <div>Typical profile</div>
          </div>
          {[
            { bucket: "Low", daily: "~20", monthly: "600", profile: "Small apartment, energy-efficient, light AC use" },
            { bucket: "Average", daily: "30 – 40", monthly: "900 – 1,200", profile: "Typical Texas household" },
            { bucket: "High", daily: "60 – 70", monthly: "1,800 – 2,100", profile: "Large home, heavy summer AC, electric heat or pool" },
          ].map((r) => (
            <div key={r.bucket} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.2fr_2fr] gap-2 md:gap-4 px-5 py-4 border-b border-border/20 last:border-b-0">
              <div className="font-[var(--font-bebas)] text-xl text-accent">{r.bucket.toUpperCase()}</div>
              <div className="font-mono text-sm text-foreground tabular-nums">{r.daily}</div>
              <div className="font-mono text-sm text-foreground tabular-nums">{r.monthly}</div>
              <div className="font-mono text-xs text-muted-foreground leading-relaxed">{r.profile}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20 border-t border-border/30 pt-12">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          03 / How to lower it
        </span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight leading-none">
          PRACTICAL WAYS TO USE LESS.
        </h2>
        <ul className="mt-10 grid md:grid-cols-2 gap-x-12 gap-y-6">
          {[
            { h: "Energy Star appliances", b: "Largest one-time impact. Refrigerators and HVAC alone drive 40–60% of most bills." },
            { h: "LED light bulbs", b: "8–12W vs 60W incandescent for the same brightness." },
            { h: "Smart thermostat", b: "Automatically adjusts when you're out — typically 8–15% HVAC savings." },
            { h: "Raise summer setpoint 2°F", b: "Each degree above 72°F cuts summer AC load by ~3%." },
            { h: "Kill phantom load", b: "Standby power from TVs, consoles, chargers can be 5–10% of total usage." },
            { h: "Run full loads", b: "Washers and dryers cost roughly the same per cycle regardless of load size." },
            { h: "Insulation + weather-stripping", b: "Cheapest fix with the longest payback. Especially around attic hatches and exterior doors." },
            { h: "Time-of-use plans", b: "If you can shift laundry and dishes to off-peak hours, a TOU plan can pay you back." },
          ].map((tip) => (
            <li key={tip.h} className="border-l-2 border-accent pl-4">
              <h3 className="font-mono text-sm font-semibold text-foreground">{tip.h}</h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground leading-relaxed">{tip.b}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="mt-20 border-t border-border/30 pt-12 pb-8">
        <div className="border border-border/40 rounded-lg p-8 md:p-10 bg-background/40">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
            Next step
          </span>
          <h3 className="mt-3 font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight leading-none">
            GOT A NUMBER? FIND A PLAN THAT FITS IT.
          </h3>
          <p className="mt-4 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
            The plan finder ranks every active plan in your ZIP at your actual
            usage level — base charges, energy charge, TDU pass-through, bill
            credits, all of it. No more guessing whether a 9.8¢/kWh teaser
            beats a 12.1¢ flat plan.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/#hero"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-background font-mono text-xs uppercase tracking-[0.3em] hover:bg-accent/90 transition-colors"
            >
              Find my plan →
            </Link>
            <Link
              href="/savings-calculator"
              className="inline-flex items-center gap-2 px-6 py-3 border border-foreground/30 font-mono text-xs uppercase tracking-[0.3em] text-foreground hover:border-accent hover:text-accent transition-colors"
            >
              Compare my current bill →
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
