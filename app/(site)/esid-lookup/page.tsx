import type { Metadata } from "next";
import Link from "next/link";
import { EsidLookup } from "@/components/esid-lookup/esid-lookup";

export const metadata: Metadata = {
  title: "ESID Lookup",
  description:
    "Find the Electric Service Identifier (ESI ID) for any address in deregulated Texas. Free address-to-ESID lookup powered by the MeterPlan registry — used when switching providers, signing up for a new plan, or pulling Smart Meter Texas data.",
};

type TduFormat = {
  name: string;
  region: string;
  prefix: string;
  digits: 17 | 22;
};

const TDU_FORMATS: TduFormat[] = [
  {
    name: "Oncor Electric Delivery",
    region: "Dallas/Fort Worth, North & Central Texas",
    prefix: "1044372… / 1017699…",
    digits: 17,
  },
  {
    name: "CenterPoint Energy",
    region: "Greater Houston, Galveston, South Texas",
    prefix: "1008901…",
    digits: 22,
  },
  {
    name: "AEP Texas Central",
    region: "Corpus Christi, Coastal Bend, South Texas",
    prefix: "1003278…",
    digits: 22,
  },
  {
    name: "AEP Texas North",
    region: "Abilene, San Angelo, West Texas",
    prefix: "1020404…",
    digits: 22,
  },
  {
    name: "Texas-New Mexico Power",
    region: "Gulf Coast, parts of North Texas",
    prefix: "1040051…",
    digits: 17,
  },
];

export default function EsidLookupPage() {
  return (
    <article className="mx-auto max-w-5xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          ESID Lookup
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          THE FINGERPRINT OF YOUR METER.
        </h1>
        <p className="mt-6 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
          Your ESI ID (Electric Service Identifier) is a 17 or 22-digit number
          permanently tied to your service address — not to you, and not to
          your provider. Use the tool below to look one up by address.
        </p>
      </header>

      <EsidLookup />

      {/* What is an ESI ID */}
      <section className="mt-24 border-t border-border/30 pt-12">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          01 / Background
        </span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight leading-none">
          WHAT IS AN ESI ID?
        </h2>
        <div className="mt-8 grid md:grid-cols-2 gap-10">
          <div>
            <p className="font-mono text-sm text-foreground/80 leading-relaxed">
              An ESI ID (sometimes written &ldquo;ESIID&rdquo;) is the unique
              identifier ERCOT assigns to every electric service point in
              deregulated Texas. Think of it as a permanent address for your
              meter: the number stays with the property forever, regardless of
              who lives there or which retail provider bills the electricity.
            </p>
            <p className="mt-4 font-mono text-sm text-foreground/80 leading-relaxed">
              When you sign up for a new plan, the provider uses your ESI ID
              to tell the TDU which meter to switch over on your start date.
              Get the wrong one and the switch lands on the wrong house.
            </p>
          </div>
          <div>
            <ul className="space-y-4">
              <li className="border-l-2 border-accent pl-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Length
                </div>
                <div className="mt-1 font-mono text-sm text-foreground">
                  17 or 22 digits, depending on TDU
                </div>
              </li>
              <li className="border-l-2 border-accent pl-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Tied to
                </div>
                <div className="mt-1 font-mono text-sm text-foreground">
                  The service address, not the person
                </div>
              </li>
              <li className="border-l-2 border-accent pl-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Issued by
                </div>
                <div className="mt-1 font-mono text-sm text-foreground">
                  Your TDU; tracked in the ERCOT registry
                </div>
              </li>
              <li className="border-l-2 border-accent pl-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  First two digits
                </div>
                <div className="mt-1 font-mono text-sm text-foreground">
                  Always <code className="text-accent">10</code> for Texas
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Format by utility */}
      <section className="mt-20 border-t border-border/30 pt-12">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          02 / Format by utility
        </span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight leading-none">
          THE FIRST 7 DIGITS ARE THE UTILITY&apos;S DNA.
        </h2>
        <p className="mt-6 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
          Every ESI ID begins with a fixed prefix identifying the TDU that
          owns the meter. If you know the prefix, you know the utility — and
          if the length is wrong, the number isn&apos;t an ESI ID at all.
        </p>

        <div className="mt-10 border border-border/40 rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_2fr_1.4fr_0.6fr] gap-4 px-5 py-3 border-b border-border/40 bg-background/40 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <div>Utility</div>
            <div>Region</div>
            <div>Prefix</div>
            <div className="text-right">Digits</div>
          </div>
          {TDU_FORMATS.map((tdu) => (
            <div
              key={tdu.name}
              className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1.4fr_0.6fr] gap-2 md:gap-4 px-5 py-4 border-b border-border/20 last:border-b-0"
            >
              <div className="font-mono text-sm text-foreground">{tdu.name}</div>
              <div className="font-mono text-xs text-muted-foreground leading-relaxed">
                {tdu.region}
              </div>
              <div className="font-mono text-xs text-accent">{tdu.prefix}</div>
              <div className="font-mono text-xs text-foreground md:text-right tabular-nums">
                {tdu.digits}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Where to find it */}
      <section className="mt-20 border-t border-border/30 pt-12">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          03 / Other ways to find yours
        </span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight leading-none">
          IF THE LOOKUP DOESN&apos;T FIND YOU.
        </h2>
        <ol className="mt-10 space-y-8">
          <li className="border-l-2 border-accent pl-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Option 01
            </div>
            <h3 className="mt-1 font-[var(--font-bebas)] text-2xl tracking-tight">
              CHECK YOUR ELECTRICITY BILL
            </h3>
            <p className="mt-2 font-mono text-sm text-foreground/80 leading-relaxed max-w-2xl">
              Look in the service-details section for &ldquo;ESI ID,&rdquo;
              &ldquo;ESIID,&rdquo; or &ldquo;Electric Service Identifier.&rdquo;
              Usually printed near your meter number — they&apos;re different
              numbers, don&apos;t confuse them.
            </p>
          </li>
          <li className="border-l-2 border-accent pl-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Option 02
            </div>
            <h3 className="mt-1 font-[var(--font-bebas)] text-2xl tracking-tight">
              CALL YOUR TDU
            </h3>
            <p className="mt-2 font-mono text-sm text-foreground/80 leading-relaxed max-w-2xl">
              Your TDU can look it up by service address. See the{" "}
              <Link
                href="/electric-utilities"
                className="text-accent hover:underline"
              >
                electric utilities directory
              </Link>{" "}
              for the right phone number.
            </p>
          </li>
        </ol>
      </section>

      {/* Validation tips */}
      <section className="mt-20 border-t border-border/30 pt-12">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          04 / Validation tips
        </span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight leading-none">
          HOW TO TELL IF A NUMBER IS WRONG.
        </h2>
        <ul className="mt-10 space-y-6">
          <li className="font-mono text-sm text-foreground/80 leading-relaxed">
            <span className="text-accent">→</span>{" "}
            <strong className="text-foreground">Oncor ESI IDs are 17 digits.</strong>{" "}
            A 22-digit number isn&apos;t Oncor — it&apos;s CenterPoint or AEP.
          </li>
          <li className="font-mono text-sm text-foreground/80 leading-relaxed">
            <span className="text-accent">→</span>{" "}
            <strong className="text-foreground">CenterPoint always starts with 1008901.</strong>{" "}
            If the first 7 digits don&apos;t match, it&apos;s a different utility.
          </li>
          <li className="font-mono text-sm text-foreground/80 leading-relaxed">
            <span className="text-accent">→</span>{" "}
            <strong className="text-foreground">All Texas ESI IDs start with 10.</strong>{" "}
            Anything else is likely a meter or account number — not an ESI ID.
          </li>
          <li className="font-mono text-sm text-foreground/80 leading-relaxed">
            <span className="text-accent">→</span>{" "}
            <strong className="text-foreground">Meter number ≠ ESI ID.</strong>{" "}
            The meter number is etched on the physical device; the ESI ID is
            assigned by the TDU and lives in the ERCOT registry.
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="mt-20 border-t border-border/30 pt-12 pb-8">
        <div className="border border-border/40 rounded-lg p-8 md:p-10 bg-background/40">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
            Next step
          </span>
          <h3 className="mt-3 font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight leading-none">
            FOUND YOUR ESI ID? FIND A BETTER PLAN.
          </h3>
          <p className="mt-4 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
            Once you know your ESI ID, you know your TDU — and that determines
            which plans are available at your address. Texergy AI ranks them
            against your actual usage profile, not a 1,000 kWh guess.
          </p>
          <Link
            href="/#hero"
            className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-accent hover:underline"
          >
            Find my plan
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </article>
  );
}
