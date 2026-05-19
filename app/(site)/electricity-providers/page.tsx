import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "Electricity Providers | Texergy AI",
  description:
    "Texas retail electricity providers (REPs) currently in Texergy AI's dataset, with plan counts and links to each company.",
};

// ISR: the daily cron calls revalidatePath('/electricity-providers') after
// ingest, so this fallback only matters if the cron misses a day.
export const revalidate = 86400;

type RepRow = {
  id: number;
  name: string;
  slug: string;
  website_url: string | null;
  logo_url: string | null;
  phone: string | null;
  puct_number: string | null;
  active_plan_count: number;
};

async function loadProviders(): Promise<RepRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Pull REPs with an aggregated active-plan count via a join.
  const { data: reps } = await supabase
    .from("reps")
    .select("id, name, slug, website_url, logo_url, phone, puct_number")
    .order("name", { ascending: true });
  if (!reps) return [];

  // Plan counts in a single round-trip.
  const { data: planCounts } = await supabase
    .from("plans")
    .select("rep_id", { count: "exact", head: false })
    .eq("active", true);
  const counts = new Map<number, number>();
  for (const p of planCounts ?? []) {
    const id = Number((p as { rep_id: number }).rep_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return reps.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    slug: String(r.slug),
    website_url: r.website_url,
    logo_url: r.logo_url,
    phone: r.phone,
    puct_number: r.puct_number,
    active_plan_count: counts.get(Number(r.id)) ?? 0,
  }));
}

export default async function ElectricityProvidersPage() {
  const providers = await loadProviders();
  const totalPlans = providers.reduce((s, r) => s + r.active_plan_count, 0);

  return (
    <article className="mx-auto max-w-5xl px-6 md:px-12">
      <header className="mb-16">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Electricity Providers
        </span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight leading-none">
          THE COMPANIES SELLING YOU POWER.
        </h1>
        <p className="mt-6 max-w-2xl font-mono text-sm text-muted-foreground leading-relaxed">
          In Texas, you pick a Retail Electric Provider (REP) — the company on
          your bill — while the utility (TDU) still owns the wires. Texergy AI
          currently tracks <span className="text-foreground">{providers.length}</span>{" "}
          providers offering <span className="text-foreground">{totalPlans.toLocaleString()}</span>{" "}
          active plans. Drop your ZIP on the{" "}
          <Link href="/" className="text-foreground hover:text-accent underline underline-offset-4">
            home page
          </Link>{" "}
          to see which of them serve your address.
        </p>
      </header>

      <ul className="divide-y divide-border/50 border-y border-border/50">
        {providers.map((rep) => (
          <li key={rep.id} className="py-5 flex items-start gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="font-[var(--font-bebas)] text-2xl tracking-tight text-foreground leading-none">
                  {rep.name}
                </h2>
                {rep.puct_number && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                    PUCT {rep.puct_number}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
                {rep.website_url && (
                  <a
                    href={rep.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    {prettyHost(rep.website_url)} ↗
                  </a>
                )}
                {rep.phone && <span>{rep.phone}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-[var(--font-bebas)] text-3xl text-foreground tabular-nums leading-none">
                {rep.active_plan_count}
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
          The list above refreshes whenever we re-ingest from Power-to-Choose
          (every plan ingest also picks up new REPs). To compare actual plans
          from these providers, head to the{" "}
          <Link href="/" className="text-foreground hover:text-accent underline underline-offset-4">
            home page
          </Link>{" "}
          and start with your ZIP.
        </p>
      </section>
    </article>
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
