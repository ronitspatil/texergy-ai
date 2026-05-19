import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Service Areas | Texergy AI",
  description:
    "Major Texas cities where Texergy AI can rank retail electricity plans, grouped by Transmission & Distribution Utility (TDU).",
};

type TduArea = {
  code: string;
  name: string;
  blurb: string;
  cities: string[];
};

// Hand-curated list of the largest deregulated Texas cities by TDU. Not every
// ZIP in these cities is deregulated (a few enclaves are co-op territory) —
// the ZIP gate on the home page is still the source of truth. This page is a
// directory, not a guarantee.
const TDU_AREAS: TduArea[] = [
  {
    code: "ONCOR",
    name: "Oncor Electric Delivery",
    blurb: "Serves most of north & central Texas, including the DFW metro and East/West Texas hubs.",
    cities: [
      "Dallas",
      "Fort Worth",
      "Arlington",
      "Plano",
      "Frisco",
      "McKinney",
      "Irving",
      "Garland",
      "Carrollton",
      "Lewisville",
      "Allen",
      "Mesquite",
      "Grand Prairie",
      "Denton",
      "Mansfield",
      "Richardson",
      "Tyler",
      "Waco",
      "Killeen",
      "Temple",
      "Midland",
      "Odessa",
      "Abilene",
      "Wichita Falls",
      "Round Rock (parts)",
    ],
  },
  {
    code: "CENTERPOINT",
    name: "CenterPoint Energy Houston Electric",
    blurb: "Greater Houston metro and surrounding suburbs.",
    cities: [
      "Houston",
      "Sugar Land",
      "The Woodlands",
      "Pasadena",
      "Pearland",
      "Conroe",
      "Baytown",
      "League City",
      "Missouri City",
      "Friendswood",
      "Spring",
      "Cypress",
      "Katy",
      "Humble",
      "Tomball",
    ],
  },
  {
    code: "AEP_CENTRAL",
    name: "AEP Texas Central",
    blurb: "South Texas coastline and Rio Grande Valley.",
    cities: [
      "Corpus Christi",
      "Laredo",
      "McAllen",
      "Harlingen",
      "Edinburg",
      "Pharr",
      "Mission",
      "Victoria",
      "Kingsville",
      "Beeville",
    ],
  },
  {
    code: "AEP_NORTH",
    name: "AEP Texas North",
    blurb: "West Texas — parts of Abilene, San Angelo, and surrounding communities.",
    cities: ["Abilene (parts)", "San Angelo (parts)", "Vernon", "Sweetwater"],
  },
  {
    code: "TNMP",
    name: "Texas-New Mexico Power (TNMP)",
    blurb: "Scattered service islands across the Gulf Coast, North Texas, and Hill Country.",
    cities: [
      "Texas City",
      "Galveston (parts)",
      "Alvin",
      "Dickinson",
      "La Marque",
      "Lewisville (parts)",
      "Friendswood (parts)",
    ],
  },
];

// Cities people commonly search for but that are NOT on the deregulated grid.
// Surfacing them explicitly saves the user from typing a ZIP only to bounce.
const REGULATED_CITIES: { name: string; provider: string }[] = [
  { name: "Austin", provider: "Austin Energy (municipal)" },
  { name: "San Antonio", provider: "CPS Energy (municipal)" },
  { name: "El Paso", provider: "El Paso Electric (regulated)" },
  { name: "College Station / Bryan", provider: "BTU (municipal) / others" },
  { name: "Lubbock", provider: "Mostly LP&L (regulated) — some Oncor pockets" },
];

export default function ServiceAreasPage() {
  return (
    <article className="mx-auto max-w-5xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Service Areas
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          WHERE TEXERGY WORKS.
        </h1>
        <p className="mt-6 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
          Texergy AI ranks plans wherever Texas retail electricity is{" "}
          <em>deregulated</em> — the parts of the state where you choose your
          own retail provider on top of the same physical wires. That covers
          most of the state, but not all of it. Pick your city below, or just
          drop your ZIP on the{" "}
          <Link href="/" className="text-foreground hover:text-accent underline underline-offset-4">
            home page
          </Link>
          .
        </p>
      </header>

      <section className="space-y-16">
        {TDU_AREAS.map((tdu) => (
          <div key={tdu.code}>
            <div className="border-l-2 border-accent pl-5 mb-6">
              <h2 className="font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight text-foreground leading-none">
                {tdu.name.toUpperCase()}
              </h2>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {tdu.code}
              </p>
              <p className="mt-3 font-mono text-sm text-foreground/80 leading-relaxed">
                {tdu.blurb}
              </p>
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-2 font-mono text-sm text-foreground/85">
              {tdu.cities.map((city) => (
                <li key={city}>{city}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-24 border-t border-border/50 pt-12">
        <div className="border-l-2 border-muted-foreground/40 pl-5 mb-6">
          <h2 className="font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight text-foreground leading-none">
            NOT ON THE DEREGULATED GRID
          </h2>
          <p className="mt-3 max-w-2xl font-mono text-sm text-foreground/80 leading-relaxed">
            A few major Texas cities don&apos;t have retail choice — your
            electricity comes from a municipal utility or co-op at a single
            regulated rate. Texergy AI can&apos;t shop these for you.
          </p>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 font-mono text-sm text-foreground/85">
          {REGULATED_CITIES.map((c) => (
            <li key={c.name} className="flex items-baseline gap-3">
              <span>{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.provider}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-24 border-t border-border/50 pt-12">
        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
          Not sure if your specific ZIP is deregulated? Drop it in the{" "}
          <Link href="/" className="text-foreground hover:text-accent underline underline-offset-4">
            ZIP gate on the home page
          </Link>{" "}
          — it checks Power-to-Choose live and tells you for sure.
        </p>
      </section>
    </article>
  );
}
