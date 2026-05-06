import { listWaitlist, waitlistCount } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { adminTokenMatches } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmt(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

export default async function WaitlistAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!process.env.ADMIN_TOKEN) {
    return (
      <main className="min-h-screen bg-background text-foreground p-8 font-sans">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Admin</span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-4xl tracking-tight mb-4">DISABLED</h1>
        <p className="text-muted-foreground max-w-xl font-mono text-sm leading-relaxed">
          Set <code className="bg-input border border-border px-1.5 py-0.5">ADMIN_TOKEN</code>{" "}
          in <code className="bg-input border border-border px-1.5 py-0.5">.env.local</code>,
          restart the dev server, then visit{" "}
          <code className="bg-input border border-border px-1.5 py-0.5">
            /admin/waitlist?token=YOUR_TOKEN
          </code>
          .
        </p>
      </main>
    );
  }

  if (!adminTokenMatches(token ?? null)) {
    return (
      <main className="min-h-screen bg-background text-foreground p-8 font-sans">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive">403</span>
        <h1 className="mt-4 font-[var(--font-bebas)] text-4xl tracking-tight mb-2">NOT AUTHORIZED</h1>
        <p className="text-muted-foreground font-mono text-sm">
          Append <code className="bg-input border border-border px-1.5 py-0.5">?token=…</code>{" "}
          to the URL with your admin token.
        </p>
      </main>
    );
  }

  const rows = await listWaitlist({ limit: 1000 });
  const total = await waitlistCount();

  return (
    <main className="min-h-screen bg-background text-foreground p-6 sm:p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
              01 / Internal
            </span>
            <h1 className="mt-3 font-[var(--font-bebas)] text-5xl tracking-tight leading-none">
              WAITLIST
            </h1>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {total} {total === 1 ? "signup" : "signups"} ·{" "}
              <span className={emailConfigured() ? "text-accent" : "text-destructive"}>
                {emailConfigured()
                  ? "Confirmation emails enabled"
                  : "Confirmation emails disabled (set RESEND_API_KEY)"}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/admin/waitlist/export?token=${encodeURIComponent(token ?? "")}`}
              className="border border-foreground/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:border-accent hover:text-accent transition-colors"
            >
              Export CSV
            </a>
          </div>
        </header>

        {rows.length === 0 ? (
          <p className="text-muted-foreground font-mono text-sm">No signups yet.</p>
        ) : (
          <div className="overflow-x-auto border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-card border-b border-border/40 text-left">
                <tr className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-12">#</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium w-20">ZIP</th>
                  <th className="px-4 py-3 font-medium w-56">Joined (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-card/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground tabular-nums font-mono">
                      {r.id}
                    </td>
                    <td className="px-4 py-3 text-foreground break-all font-mono text-xs">
                      {r.email}
                    </td>
                    <td className="px-4 py-3 text-foreground/80 tabular-nums font-mono">
                      {r.zip ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {fmt(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
