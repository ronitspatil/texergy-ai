import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "Electric Utilities (TDUs) | Texergy AI",
  description:
    "The Transmission & Distribution Utilities (TDUs) that own the wires in deregulated Texas, with plan counts available in each footprint.",
};

// ISR: the daily cron calls revalidatePath('/electric-utilities') after
// ingest, so this fallback only matters if the cron misses a day.
export const revalidate = 86400;

type TduRow = {
  id: number;
  code: string;
  name: string;
  duns: string | null;
  active_plan_count: number;
};

// Short blurb per TDU code so users get geographic context even before they
// type a ZIP. Keep in sync with /service-areas.
const FOOTPRINT_BLURB: Record<string, string> = {
  ONCOR: "North & central Texas — DFW metro, Tyler, Waco, Killeen, Midland-Odessa, Abilene.",
  CENTERPOINT: "Greater Houston metro — Houston, Sugar Land, The Woodlands, Conroe.",
  AEP_CENTRAL: "South Texas — Corpus Christi, Laredo, McAllen, Harlingen, Rio Grande Valley.",
  AEP_NORTH: "West Texas — parts of Abilene, San Angelo, Vernon, Sweetwater.",
  TNMP: "Scattered service islands — Gulf Coast (Texas City, Galveston), Hill Country pockets, north of DFW.",
};

async function loadUtilities(): Promise<TduRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: tdus } = await supabase
    .from("tdus")
    .select("id, code, name, duns")
    .order("name", { ascending: true });
  if (!tdus) return [];

  const { data: planRows } = await supabase
    .from("plans")
    .select("tdu_id")
    .eq("active", true);
  const counts = new Map<number, number>();
  for (const p of planRows ?? []) {
    const tid = (p as { tdu_id: number | null }).tdu_id;
    if (tid == null) continue;
    counts.set(Number(tid), (counts.get(Number(tid)) ?? 0) + 1);
  }

  return tdus.map((t) => ({
    id: Number(t.id),
    code: String(t.code),
    name: String(t.name),
    duns: t.duns,
    active_plan_count: counts.get(Number(t.id)) ?? 0,
  }));
}

export default async function ElectricUtilitiesPage() {
  const utilities = await loadUtilities();

  return (
    <article className="mx-auto max-w-5xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Electric Utilities
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          THE WIRES, NOT THE BILL.
        </h1>
        <p className="mt-6 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
          In deregulated Texas, your Transmission &amp; Distribution Utility
          (TDU) owns the poles and wires that physically deliver power to your
          home. You don&apos;t choose your TDU — it&apos;s determined by where you live —
          but it determines <em>which</em> plans you can pick from. Here are
          the five TDUs we cover.
        </p>
      </header>

      <ul className="space-y-10">
        {utilities.map((tdu) => (
          <li
            key={tdu.id}
            className="border-l-2 border-accent pl-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <h2 className="font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight text-foreground leading-none">
                {tdu.name.toUpperCase()}
              </h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>{tdu.code}</span>
                {tdu.duns && <span>DUNS {tdu.duns}</span>}
              </div>
              {FOOTPRINT_BLURB[tdu.code] && (
                <p className="mt-3 max-w-2xl font-mono text-sm text-foreground/80 leading-relaxed">
                  {FOOTPRINT_BLURB[tdu.code]}
                </p>
              )}
            </div>
            <div className="md:text-right shrink-0">
              <div className="font-[var(--font-bebas)] text-4xl text-foreground tabular-nums leading-none">
                {tdu.active_plan_count}
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                Active plans
              </div>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-24 border-t border-border/50 pt-12">
        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
          Want to see the cities each utility serves?{" "}
          <Link
            href="/service-areas"
            className="text-foreground hover:text-accent underline underline-offset-4"
          >
            Browse service areas
          </Link>
          . Or just{" "}
          <Link
            href="/"
            className="text-foreground hover:text-accent underline underline-offset-4"
          >
            drop your ZIP on the home page
          </Link>{" "}
          to see plans available where you live.
        </p>
      </section>
    </article>
  );
}
