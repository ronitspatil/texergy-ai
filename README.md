# Texergy AI

Texergy ranks Texas retail electricity plans against what you actually care about. Enter a ZIP code, tell it what matters, and get an ordered list of real plans with projected monthly bills. Free, no sign-up.

Live at **[texergy.ai](https://texergy.ai)**.

## The problem it solves

Every Texas plan ships an Electricity Facts Label (EFL) full of details that decide your real bill: bill credits that only trigger at certain usage, tiered rates with cliffs between 500/1000/2000 kWh, TDU pass-through charges, base charges, early termination fees, renewable mix. The advertised cents-per-kWh number hides all of it.

Texergy parses those EFLs nightly, projects what each plan would actually cost at *your* usage, and scores them on seven factors you control.

## How to use it

### 1. Enter your ZIP

The ZIP determines your TDU (utility) and therefore which plans and delivery charges apply. Anything outside a deregulated Texas ZIP is rejected up front.

### 2. Pick a path

| Path | What it asks for | Time |
|---|---|---|
| **Smart Match** | A short profile, then weight sliders for 7 ranking factors | ~30s |
| **Basic Filters** | Just rate type, term, and green minimum, applied as hard filters | ~10s |
| **Meter Upload** | Your Smart Meter Texas `IntervalData.csv` export | ~20s |

Smart Match uses your answers as *preferences* (they bias the ranking). Basic Filters uses them as *filters* (non-matching plans disappear).

### 3. Set usage

Pick a preset (Apartment ≈ 500 kWh, Average Home ≈ 1000, Large Home ≈ 2000), type a number, or click **Estimate my usage** to pull a 12-month WattBuy forecast from your ZIP and home size. Meter Upload skips this and derives your true monthly average from the CSV.

To get the CSV: log in to [Smart Meter Texas](https://www.smartmetertexas.com), request an interval-data report, and upload the `IntervalData.csv` it emails you. It's parsed entirely in your browser — the file is never sent to the server. Up to 13 months of data is supported.

### 4. Tune the weights (Smart Match only)

Seven factors, weighted to taste. Answer the quick quiz to derive a starting set, or drag the sliders directly.

| Factor | What it rewards |
|---|---|
| **Cost** | Lower projected monthly bill at your usage |
| **Renewable** | Higher renewable content |
| **Flexibility** | Low ETF and short contract terms |
| **Rate preference** | Plans matching your preferred rate type |
| **Historical pricing** | Plans priced below the EIA Texas residential trailing-12-month average |
| **Seasonality** | Fixed plans whose term covers TX summer/winter spike windows; penalizes Variable plans for the same exposure |
| **Bill transparency** | Plans whose bill tracks the advertised rate; penalizes bill credits, minimum-usage fees, and steep tier cliffs |

Default is a balanced 35/10/10/15/10/10/10 split.

### 5. Read the results

Each plan card shows the projected monthly bill at your usage, the score breakdown per factor, and the fine print that drove it. From there you can:

- **Compare** up to 3 plans side-by-side, and ask a plain-English question about the ones you're comparing
- See your **usage forecast** month by month
- See **market price history** for your TDU against the EIA Texas average
- Jump to the provider to sign up (Texergy doesn't sell plans or take commissions)

## Standalone tools

- **[/savings-calculator](https://texergy.ai/savings-calculator)** — estimate savings against your current rate
- **[/usage-calculator](https://texergy.ai/usage-calculator)** — kWh estimate from home size and appliances
- **[/esid-lookup](https://texergy.ai/esid-lookup)** — find your meter's ESID from an address
- **[/electricity-providers](https://texergy.ai/electricity-providers)** and **[/electric-utilities](https://texergy.ai/electric-utilities)** — who serves what
- **[/texas-energy-101](https://texergy.ai/texas-energy-101)** — how the deregulated market works

## Where the data comes from

```
GitHub Actions (daily, 08:30 UTC)
  ├─ scripts/ingest-plans.mjs         scrape Power to Choose plan listings
  ├─ scripts/snapshot-prices.mjs      per-TDU price snapshot for history charts
  └─ EFL parsing, three tiers, each handling what the last couldn't:
       ├─ scripts/parse-efls.mjs             Tier A — regex over extracted PDF text
       ├─ scripts/parse-efls-llamaparse.mjs  Tier B — LlamaParse on Tier-A failures
       └─ scripts/parse-efls-gemini.mjs      Tier C — Gemini on the remainder
                └─ Supabase (plans + plan_details)
                     └─ /api/recommend  weighted ranking engine
                          └─ /find/recommend  wizard UI
```

EIA data (`scripts/fetch-eia-prices.mjs`, `scripts/fetch-eia-baseline.mjs`) supplies the market averages behind the historical-pricing factor and the price-history chart.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict |
| Styling | Tailwind v4, IBM Plex Sans + Mono, Bebas Neue |
| Database | Supabase (Postgres), service-role server-side only |
| Plan data | Power to Choose scraping + EFL PDF parsing (unpdf → LlamaParse → Gemini) |
| Usage estimation | WattBuy API |
| Market data | EIA open data |
| Ingestion | GitHub Actions daily cron |
| Animation | GSAP, Framer Motion, Lenis |

## Running locally

```bash
npm install
cp .env.local.example .env.local
# fill in the required variables, then:
npm run dev
# → http://localhost:3000
```

### Required environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key; all DB access is server-side |
| `ADMIN_TOKEN` | Gates `/admin/*` routes |
| `IP_HASH_SALT` | Salt for SHA-256 IP hashing |
| `CRON_SECRET` | Bearer token for cron-triggered routes |
| `NEWSLETTER_TOKEN_SECRET` | Signs unsubscribe tokens |

Generate any of the random ones with:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

### Optional

| Variable | Enables |
|---|---|
| `WATTBUY_API_KEY` | Usage estimation; falls back to manual entry when unset |
| `GEMINI_API_KEY` | Plan Q&A bot and Tier-C EFL parsing |
| `LLAMA_CLOUD_API_KEY` | Tier-B EFL parsing |
| `EIA_API_KEY` | Market price + baseline fetches |
| `RESEND_API_KEY`, `WAITLIST_FROM_EMAIL` | Transactional email |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin (defaults to `https://texergy.ai`) |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN` | Analytics, error tracking |

Every feature above degrades gracefully when its key is missing, so a minimal local setup only needs the required table.

### Data pipeline scripts

```bash
npm run ingest:plans       # scrape Power to Choose
npm run parse:efls         # Tier A EFL parsing
npm run snapshot:prices    # per-TDU price snapshot
npm run fetch:eia-prices   # EIA market prices
npm run rank:test          # exercise the ranking engine
```

## Project layout

```
app/
  find/recommend/      the wizard (mode → profile → weights → results)
  (site)/              tools and content pages
  api/
    recommend/         weighted ranking endpoint
    usage-estimate/    WattBuy forecast proxy
    usage-baseline/    fallback usage profile
    price-history/     TDU price history for the results chart
    esid-lookup/       address → ESID
    zip-check/         ZIP validation + TDU resolution
    ask-bot/           plan Q&A behind the compare dialog (Gemini, rate-limited)
    providers/         provider listing
  admin/               token-gated ingest admin
components/find/
  recommend-wizard.tsx wizard state machine
  steps/               mode, questions, weights, upload, results
  plan-card.tsx        result card with score breakdown
  compare-dialog.tsx   side-by-side comparison
lib/
  ranking/             scoring engine — cost.ts, score.ts, recommend.ts
  usage-profile/       usage shape modeling
  price-history.ts     EIA + snapshot series
  db.ts                Supabase client and queries
  rate-limit.ts        in-memory token bucket per hashed IP
  request-guard.ts     same-origin checks, IP hashing
scripts/               ingestion and parsing jobs
```

## Security

- Same-origin check (`Referer` + `Origin`) on every POST endpoint
- In-memory rate limiting per hashed IP
- IPs stored only as `SHA-256(salt + ip)`; no raw IPs persisted
- Meter CSVs parsed client-side and never uploaded
- Admin routes use constant-time token comparison
- Hardened CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy in `next.config.ts`
- Full threat model in [`SECURITY.md`](./SECURITY.md)

## License

MIT — see [`LICENSE`](./LICENSE).
