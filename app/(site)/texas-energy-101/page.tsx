import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Texas Energy 101 | Texergy AI",
  description:
    "A plain-language guide to the Texas retail electricity market: deregulation, ERCOT, TDUs, REPs, plan types, EFLs, the 1000 kWh average-rate problem, bill credits, ETFs, and how to compare plans.",
};

// Refresh occasionally; content is mostly evergreen but we may edit copy.
export const revalidate = 86400;

type Section = {
  id: string;
  label: string;
  title: string;
};

const SECTIONS: Section[] = [
  { id: "deregulation", label: "Deregulation", title: "WHAT ‘DEREGULATED’ MEANS" },
  { id: "three-actors", label: "Three actors", title: "THE THREE ACTORS ON YOUR BILL" },
  { id: "ercot", label: "ERCOT", title: "ERCOT, THE TEXAS GRID OPERATOR" },
  { id: "plan-types", label: "Plan types", title: "PLAN TYPES: FIXED VS. VARIABLE" },
  { id: "efl", label: "EFL", title: "THE EFL: THE ONLY COMPARABLE DOCUMENT" },
  { id: "1000kwh-trap", label: "1000 kWh", title: "THE 1000 kWh AVERAGE-RATE PROBLEM" },
  { id: "bill-credits", label: "Bill credits", title: "BILL CREDITS AND PROMOS" },
  { id: "tdu-charges", label: "TDU charges", title: "TDU DELIVERY CHARGES" },
  { id: "green", label: "Green plans", title: "WHAT ‘100% GREEN’ PLANS ACTUALLY BUY" },
  { id: "tou", label: "Time-of-use", title: "FREE NIGHTS AND TIME-OF-USE PLANS" },
  { id: "etf", label: "ETF", title: "EARLY TERMINATION FEES" },
  { id: "switching", label: "Switching", title: "SWITCHING PROVIDERS" },
  { id: "rights", label: "Rights", title: "DISCONNECTS AND CUSTOMER RIGHTS" },
  { id: "glossary", label: "Glossary", title: "GLOSSARY" },
];

function SectionHeader({ id, eyebrow, title }: { id: string; eyebrow?: string; title: string }) {
  return (
    <div id={id} className="scroll-mt-24 border-l-2 border-accent pl-5 mb-6">
      {eyebrow ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1 font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight text-foreground leading-none">
        {title}
      </h2>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-sm text-foreground/85 leading-relaxed">
      {children}
    </p>
  );
}

export default function TexasEnergy101Page() {
  return (
    <article className="mx-auto max-w-3xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Texas Energy 101
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          A GUIDE TO THE TEXAS ELECTRICITY MARKET.
        </h1>
        <p className="mt-6 font-mono text-sm text-muted-foreground leading-relaxed">
          The Texas retail electricity market is hard to navigate. There are
          hundreds of plans in any given ZIP, the marketing material is
          unreliable, and the comparison sites lean on a single advertised
          rate that doesn&apos;t reflect what most households will pay. This
          page walks through how the market is set up and what to look for
          when you shop.
        </p>
        <p className="mt-4 font-mono text-sm text-muted-foreground leading-relaxed">
          If you only have a few minutes, jump to{" "}
          <Link href="#1000kwh-trap" className="text-foreground hover:text-accent underline underline-offset-4">
            the 1000 kWh average-rate problem
          </Link>
          . It&apos;s the most important thing to understand before comparing
          plans.
        </p>
      </header>

      {/* Table of contents */}
      <nav
        aria-label="On this page"
        className="mb-20 border border-border/60 rounded-md p-6"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
          On this page
        </p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-xs">
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="flex items-baseline gap-3">
              <span className="text-muted-foreground tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <a
                href={`#${s.id}`}
                className="text-foreground/85 hover:text-accent transition-colors"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-20">
        {/* 1. Deregulation */}
        <section>
          <SectionHeader id="deregulation" eyebrow="01" title={SECTIONS[0].title} />
          <div className="space-y-4">
            <P>
              In 1999 Texas restructured its electricity industry. Before
              then, your utility owned everything from the power plant to the
              wires to your meter, and the state set the rates. After
              restructuring, three different companies handle three different
              parts of getting power to your house, and you choose one of
              them.
            </P>
            <P>
              About 85% of Texans live in deregulated areas. Most of the rest
              are served by municipal utilities (Austin Energy, CPS Energy in
              San Antonio, BTU in Bryan), electric cooperatives, or regulated
              utilities like El Paso Electric. In those areas you have one
              option at one rate.
            </P>
            <P>
              In the deregulated parts of the state, you pick your retail
              provider. There are routinely 200+ active plans in any given
              ZIP, and the rules that govern how plans are marketed make
              direct comparison difficult.
            </P>
          </div>
        </section>

        {/* 2. Three actors */}
        <section>
          <SectionHeader id="three-actors" eyebrow="02" title={SECTIONS[1].title} />
          <div className="space-y-4">
            <P>
              Every kilowatt-hour you use passes through three separate
              companies. Knowing which one does what makes the rest of the
              market easier to read.
            </P>
            <div className="space-y-6 mt-6">
              <div className="border-l border-border pl-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-1">
                  The TDU (your utility)
                </p>
                <P>
                  Owns the poles, wires, and meter at your house. Reads the
                  meter, restores power during outages, and charges delivery
                  fees that appear on every bill regardless of your retail
                  provider. The five Texas TDUs are Oncor (most of north and
                  central Texas, including DFW), CenterPoint (the Houston
                  metro), AEP Texas Central (south Texas and the Rio Grande
                  Valley), AEP Texas North (parts of west Texas), and
                  Texas-New Mexico Power (scattered pockets). You don&apos;t
                  choose your TDU; your address picks it.
                </P>
              </div>
              <div className="border-l border-border pl-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-1">
                  The REP (your retailer)
                </p>
                <P>
                  Buys electricity on the wholesale market and resells it to
                  you. Sets the energy rate, sends the bill, runs marketing,
                  and handles customer service. This is the company you shop
                  for. Around 150 REPs are active in Texas, from large
                  incumbents like TXU and Reliant to small upstarts.
                </P>
              </div>
              <div className="border-l border-border pl-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-1">
                  ERCOT (the grid operator)
                </p>
                <P>
                  Runs the physical Texas grid. Matches generation to demand
                  in real time, operates the wholesale market that REPs buy
                  from, and coordinates emergency response. ERCOT covers
                  about 90% of the Texas electric load. It&apos;s a not-for-profit
                  and does not bill consumers directly.
                </P>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ERCOT */}
        <section>
          <SectionHeader id="ercot" eyebrow="03" title={SECTIONS[2].title} />
          <div className="space-y-4">
            <P>
              ERCOT (Electric Reliability Council of Texas) is the part that
              makes the Texas grid unusual. Most of the country sits on one
              of two large interconnected grids, the Eastern or Western
              Interconnection. Texas operates its own grid in large part to
              stay out of federal regulation. That isolation is why Texas
              couldn&apos;t import emergency power during Winter Storm Uri in
              February 2021.
            </P>
            <P>
              ERCOT runs an energy-only wholesale market. Prices spike during
              shortages instead of paying generators a fixed capacity fee
              year-round. In typical weather the wholesale price is 3 to 7
              cents per kWh; during scarcity events it can reach the
              regulatory cap of $5,000/MWh ($5/kWh) and stay there for hours.
              REPs hedge against these spikes. If you&apos;re on a fixed plan,
              you don&apos;t see them. If you&apos;re on a variable or
              wholesale-passthrough plan, you do.
            </P>
          </div>
        </section>

        {/* 4. Plan types */}
        <section>
          <SectionHeader id="plan-types" eyebrow="04" title={SECTIONS[3].title} />
          <div className="space-y-4">
            <P>
              In practice every Texas retail plan is either fixed or variable.
              Power to Choose labels each plan explicitly, and so does every
              EFL.
            </P>
            <dl className="space-y-5 mt-4">
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.2em] text-foreground mb-1">
                  Fixed
                </dt>
                <dd>
                  <P>
                    The energy rate is locked for the contract length, usually
                    12, 24, or 36 months. The TDU pass-throughs can still
                    change (those aren&apos;t controlled by your REP), but the
                    REP&apos;s portion stays the same. Roughly 80% of plans are
                    fixed, and most households are best served by these.
                  </P>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.2em] text-foreground mb-1">
                  Variable
                </dt>
                <dd>
                  <P>
                    The REP can change your rate from one month to the next
                    with notice. Often starts at an attractive intro rate
                    that climbs quietly. No contract length and no ETF. Fine
                    for someone moving in 60 days; risky for someone who&apos;ll
                    forget about it.
                  </P>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* 5. EFL */}
        <section>
          <SectionHeader id="efl" eyebrow="05" title={SECTIONS[4].title} />
          <div className="space-y-4">
            <P>
              The Electricity Facts Label is the one-page standardized
              disclosure every REP has to publish for every plan. It&apos;s the
              document that lets you compare plans like for like. Marketing
              copy varies; the EFL is what you sign.
            </P>
            <P>
              What to look for, roughly in order:
            </P>
            <ul className="space-y-3 font-mono text-sm text-foreground/85 leading-relaxed list-none pl-0">
              <li>
                <span className="text-accent">›</span> The Average Price
                table at 500, 1,000, and 2,000 kWh. These three numbers are
                the only ones comparable across plans.
              </li>
              <li>
                <span className="text-accent">›</span> The Energy Charge: what
                the REP charges per kWh before TDU fees and before any bill
                credits.
              </li>
              <li>
                <span className="text-accent">›</span> The Base Charge (also
                called Customer Charge or Monthly Service Fee): a flat
                $/month regardless of usage.
              </li>
              <li>
                <span className="text-accent">›</span> TDU Delivery Charges: a
                per-kWh component and often a per-month component. These are
                the same across all REPs in your TDU.
              </li>
              <li>
                <span className="text-accent">›</span> Bill credits and the
                kWh thresholds that trigger them.
              </li>
              <li>
                <span className="text-accent">›</span> The Early Termination
                Fee and contract length.
              </li>
              <li>
                <span className="text-accent">›</span> Renewable energy
                content (percent and sourcing).
              </li>
            </ul>
            <P>
              If a plan&apos;s EFL link is broken or the document is missing,
              treat that as a warning sign.
            </P>
          </div>
        </section>

        {/* 6. 1000 kWh problem */}
        <section>
          <SectionHeader id="1000kwh-trap" eyebrow="06" title={SECTIONS[5].title} />
          <div className="space-y-4">
            <P>
              The advertised rate on Power to Choose is the average cents per
              kWh at exactly 1,000 kWh of monthly usage. Because that&apos;s
              the number shoppers compare on, many plans are priced to look
              cheapest at that specific usage level.
            </P>
            <P>
              A common pattern: a plan stacks a $100 bill credit at 1,000
              kWh. At 999 kWh of usage you get no credit and pay roughly 16
              cents per kWh; at 1,001 kWh the credit kicks in and the
              effective rate drops to around 9 cents. The advertised average
              rate is calculated with the credit applied, which makes the
              plan look strong on the comparison shelf even though most
              months it won&apos;t deliver that price.
            </P>
            <P>
              The fix is the EFL&apos;s 500, 1,000, and 2,000 kWh table. If
              those three numbers vary widely from one another, the plan is
              cliff-priced. It&apos;s cheap only in a narrow usage band, and
              your real usage may sit outside that band.
            </P>
            <P>
              Best approach: pull the last 12 months of bills, take your
              average monthly kWh, and evaluate each plan at your usage
              rather than at 1,000 kWh.
            </P>
          </div>
        </section>

        {/* 7. Bill credits */}
        <section>
          <SectionHeader id="bill-credits" eyebrow="07" title={SECTIONS[6].title} />
          <div className="space-y-4">
            <P>
              Bill credits can lower real bills. The problem is how they
              distort the advertised rate. There are three common variants
              to recognize.
            </P>
            <ul className="space-y-3 font-mono text-sm text-foreground/85 leading-relaxed list-none pl-0">
              <li>
                <span className="text-accent">›</span> Threshold credit. &ldquo;Get
                $X off when you use at least Y kWh.&rdquo; This creates the
                cliff described above.
              </li>
              <li>
                <span className="text-accent">›</span> Tiered rate. A different
                per-kWh price above or below a threshold. Less common than
                threshold credits but similar in effect.
              </li>
              <li>
                <span className="text-accent">›</span> Intro or promo credit.
                A one-time credit in the first month or two that pulls down
                the headline average price for a 12-month plan. The
                steady-state rate is higher.
              </li>
            </ul>
            <P>
              A simpler structure (one per-kWh energy charge, a modest base
              fee, no threshold credit) is usually easier to evaluate and
              less likely to surprise you on a low-usage month.
            </P>
          </div>
        </section>

        {/* 8. TDU charges */}
        <section>
          <SectionHeader id="tdu-charges" eyebrow="08" title={SECTIONS[7].title} />
          <div className="space-y-4">
            <P>
              TDU delivery charges are regulated and identical across every
              REP in your TDU territory. They usually run around 4 to 5 cents
              per kWh plus a few dollars per month. REPs are required to pass
              them through unchanged, but they aren&apos;t required to itemize
              them the same way on the bill, which is part of why the same
              plan can look different from two different REPs.
            </P>
            <P>
              TDU rates adjust a few times a year, set by PUCT rate cases.
              Even a fixed plan&apos;s total bill changes when those adjustments
              happen, because only the REP portion of the rate is locked.
            </P>
          </div>
        </section>

        {/* 9. Green */}
        <section>
          <SectionHeader id="green" eyebrow="09" title={SECTIONS[8].title} />
          <div className="space-y-4">
            <P>
              The electrons reaching your house come from whatever ERCOT
              dispatched at that moment: natural gas, wind, solar, coal, and
              nuclear in some mix. A 100% renewable plan doesn&apos;t route
              green electrons specifically to your meter.
            </P>
            <P>
              What you&apos;re buying on a green plan is Renewable Energy
              Certificates (RECs), a tradeable credit issued for every MWh of
              renewable generation somewhere on the grid. Your REP retires
              enough RECs to cover your usage. This isn&apos;t meaningless: REC
              demand is part of how renewable projects earn revenue. But the
              electrons in your wires are still grid average.
            </P>
            <P>
              Some green plans charge a premium and some price the same as
              conventional plans because Texas has surplus cheap wind. Both
              can be reasonable choices. The question to ask is whether the
              premium you&apos;re paying matches the impact you&apos;re hoping for.
            </P>
          </div>
        </section>

        {/* 10. TOU */}
        <section>
          <SectionHeader id="tou" eyebrow="10" title={SECTIONS[9].title} />
          <div className="space-y-4">
            <P>
              Time-of-use plans charge different rates at different hours.
              Free Nights plans (typically 8pm to 6am) and Free Weekends
              plans are the loudest example.
            </P>
            <P>
              These plans recover the cost of the free hours through a
              higher day rate. They work well if you can shift a meaningful
              share of your usage (EV charging, pool pumps, laundry,
              dishwasher) into the free window. They&apos;re a poor fit if you
              work from home, run heavy AC during the day, or use little
              power overnight.
            </P>
            <P>
              The way to tell whether one fits you is to look at your hourly
              usage data. Most TDUs let you download interval data through
              the SmartMeterTexas portal. If less than around 30% of your
              usage falls in the free window, a free-X plan usually costs
              more than a flat-rate plan.
            </P>
          </div>
        </section>

        {/* 11. ETF */}
        <section>
          <SectionHeader id="etf" eyebrow="11" title={SECTIONS[10].title} />
          <div className="space-y-4">
            <P>
              Early termination fees on fixed plans typically run $150 to
              $295, flat regardless of how many months are left. Variable and
              month-to-month plans don&apos;t have an ETF.
            </P>
            <P>
              Texas law gives you a moving exemption. If you move out of your
              service address and provide proof (a lease, closing documents,
              a forwarding address), the ETF is waived. REPs don&apos;t always
              advertise this, so you may need to ask and submit the
              paperwork. Keep a copy.
            </P>
            <P>
              You also have a three-day rescission right. After enrolling in
              a new plan you can cancel within three federal business days
              of the enrollment confirmation with no penalty.
            </P>
          </div>
        </section>

        {/* 12. Switching */}
        <section>
          <SectionHeader id="switching" eyebrow="12" title={SECTIONS[11].title} />
          <div className="space-y-4">
            <P>
              Switching REPs is one of the easier parts of this market. The
              wires don&apos;t change; only the company that bills you does. The
              switch takes one to three meter cycles, usually one billing
              cycle. You pick a switch date and the new REP coordinates with
              the TDU and your old REP.
            </P>
            <P>
              A few things to do before you switch:
            </P>
            <ul className="space-y-2 font-mono text-sm text-foreground/85 leading-relaxed list-none pl-0">
              <li>
                <span className="text-accent">›</span> Check your current
                contract&apos;s ETF and end date. If you&apos;re close to expiry,
                waiting can save you the fee.
              </li>
              <li>
                <span className="text-accent">›</span> Grab a recent bill so
                you have your ESI ID handy, a 17- or 22-digit number that
                uniquely identifies your meter.
              </li>
              <li>
                <span className="text-accent">›</span> Read the new plan&apos;s
                EFL, not just the marketing page.
              </li>
              <li>
                <span className="text-accent">›</span> Save the enrollment
                confirmation email. The three-day rescission clock starts
                there.
              </li>
            </ul>
            <P>
              Once you switch, the old REP sends a final bill in the next 30
              to 60 days. You don&apos;t cancel separately; the switch itself
              ends the old contract.
            </P>
          </div>
        </section>

        {/* 13. Rights */}
        <section>
          <SectionHeader id="rights" eyebrow="13" title={SECTIONS[12].title} />
          <div className="space-y-4">
            <P>
              The PUCT publishes a document called Your Rights as a Customer
              (YRAC) that every REP must give you at enrollment. Some of the
              points worth knowing:
            </P>
            <ul className="space-y-2 font-mono text-sm text-foreground/85 leading-relaxed list-none pl-0">
              <li>
                <span className="text-accent">›</span> REPs cannot disconnect
                customers during a weather extreme declared by the PUCT.
                These declarations typically cover heat advisories and freeze
                warnings.
              </li>
              <li>
                <span className="text-accent">›</span> A REP cannot change
                material terms of your fixed plan mid-contract. If they do,
                the contract is broken and you can leave without paying the
                ETF.
              </li>
              <li>
                <span className="text-accent">›</span> Disconnect notices
                require at least 10 days&apos; written notice, often more for
                customers registered as medically vulnerable.
              </li>
              <li>
                <span className="text-accent">›</span> You can dispute a bill
                in writing. The REP has to investigate and cannot disconnect
                over the disputed portion while the dispute is open.
              </li>
              <li>
                <span className="text-accent">›</span> Complaints can be
                escalated to the PUCT&apos;s Customer Protection Division. The
                process is free and doesn&apos;t require a lawyer.
              </li>
            </ul>
          </div>
        </section>

        {/* 14. Glossary */}
        <section>
          <SectionHeader id="glossary" eyebrow="14" title={SECTIONS[13].title} />
          <dl className="space-y-5 font-mono text-sm text-foreground/85 leading-relaxed">
            {[
              ["EFL", "Electricity Facts Label. The standardized one-page disclosure every plan must publish."],
              ["TOS", "Terms of Service. The full contract, including ETF, billing terms, and late fees."],
              ["YRAC", "Your Rights as a Customer. PUCT-mandated rights disclosure."],
              ["TDU / TDSP", "Transmission and Distribution Utility. The wires company. Five operate in Texas."],
              ["REP", "Retail Electric Provider. The company that bills you. Around 150 active in Texas."],
              ["ERCOT", "Independent operator of the Texas grid and wholesale market."],
              ["PUCT", "Public Utility Commission of Texas. The state regulator."],
              ["ESI ID", "Electric Service Identifier. A 17- or 22-digit unique meter ID."],
              ["kWh", "Kilowatt-hour. A unit of energy. A typical Texas household uses around 1,200 kWh/month."],
              ["REC", "Renewable Energy Certificate. Unit of renewable attribution sold with green plans."],
              ["Bill credit", "A flat dollar discount applied when usage clears a threshold."],
              ["Base / Customer / Service charge", "Flat monthly fee independent of usage."],
              ["ETF", "Early Termination Fee. Flat penalty for leaving a fixed plan early."],
              ["Rescission", "Three-day right to cancel a new enrollment with no penalty."],
              ["TOU", "Time-of-use. A plan with different rates at different hours."],
              ["MUF", "Minimum Usage Fee. Penalty for using less than a set threshold, usually 500 or 1,000 kWh."],
            ].map(([term, def]) => (
              <div key={term} className="grid grid-cols-[7rem_1fr] gap-4">
                <dt className="text-foreground uppercase tracking-wider text-xs">{term}</dt>
                <dd>{def}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* Footer CTA */}
      <section className="mt-24 border-t border-border/50 pt-12">
        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
          When you&apos;re ready to compare plans, drop your ZIP on the{" "}
          <Link href="/" className="text-foreground hover:text-accent underline underline-offset-4">
            home page
          </Link>
          . Texergy AI reads each plan&apos;s EFL, runs the math at your real
          usage, and ranks plans so cliff-priced offers don&apos;t hide near the
          top of the list.
        </p>
      </section>
    </article>
  );
}
