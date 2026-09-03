# Texergy AI

Texergy ranks Texas retail electricity plans against what you actually care about. Enter a ZIP code, tell it what matters, and get an ordered list of real plans with projected monthly bills. Free, no sign-up.

Live at **[texergy.ai](https://texergy.ai)**.

## The problem it solves

Every Texas plan ships an Electricity Facts Label (EFL) full of details that decide your real bill: bill credits that only trigger at certain usage, tiered rates with cliffs between 500/1000/2000 kWh, TDU pass-through charges, base charges, early termination fees, renewable mix. The advertised cents-per-kWh number hides all of it.

Texergy parses those EFLs nightly, projects what each plan would actually cost at *your* usage, and scores them on seven factors you control.

## How to use it

### 1. Enter your ZIP

The ZIP goes in the field on the home page. It determines your TDU (utility) and therefore which plans and delivery charges apply. Anything outside a deregulated Texas ZIP is rejected up front.

That drops you straight into Smart Match — one flow, three steps: **profile → weights → results**. There's no mode to choose.

### 2. Build your profile

One step, five fields (everything but usage is optional):

| Field | What it does |
|---|---|
| **Monthly usage** | Pick a preset (Apartment ≈ 500 kWh, Avg. Home ≈ 1000, Large Home ≈ 2000), type a number, click **Estimate my usage** for a 12-month WattBuy forecast from your ZIP and home size, or upload your meter data (below) |
| **What's in your home** | Smart thermostat, EV, solar, battery/generator — these bias the ranking (an EV owner benefits from time-of-use, a solar customer cares about minimum-usage fees) |
| **Rate type** | Fixed or Variable; a non-"Any" pick narrows the candidate set |
| **Renewable energy** | Minimum renewable content (≥25/50/90/100%) |
| **Contract length** | Month-to-month, ≤ 6 mo, 12 mo, 24+ mo |

**Smart Meter Texas import** sits inside the usage field. Log in to [Smart Meter Texas](https://www.smartmetertexas.com), request an interval-data report, and upload the `IntervalData.csv` it emails you — up to 13 months of 15-minute intervals. It's parsed entirely in your browser, so the file never reaches the server, and your true monthly average replaces whatever was in the usage box.

### 3. Tune the weights

Seven factors, weighted to taste. Answer the quick quiz to derive a starting set, or switch to the sliders and drag them directly.

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

### 4. Read the results

Each plan card shows the projected monthly bill at your usage, the score breakdown per factor, and the fine print that drove it. Results can be re-sorted by match, rate, term, estimated bill, or termination fee. From there you can:

- **Compare** up to 3 plans side-by-side, and ask a plain-English question about the ones you're comparing
- See your **usage forecast** month by month
- See **market price history** for your TDU against the EIA Texas average
- Jump to the provider to sign up (Texergy doesn't sell plans or take commissions)

## Standalone tools

- **[/savings-calculator](https://texergy.ai/savings-calculator)** — estimate savings against your current rate
- **[/usage-calculator](https://texergy.ai/usage-calculator)** — kWh estimate from home size and appliances
- **[/esid-lookup](https://texergy.ai/esid-lookup)** — find your meter's ESID from an address
- **[/electricity-providers](https://texergy.ai/electricity-providers)**, **[/electric-utilities](https://texergy.ai/electric-utilities)**, and **[/service-areas](https://texergy.ai/service-areas)** — who serves what
- **[/texas-energy-101](https://texergy.ai/texas-energy-101)** — how the deregulated market works

## Where the data comes from

```
GitHub Actions (daily, 08:30 UTC)
  ├─ scripts/ingest-plans.mjs         Power to Choose API → reps/plans/tdus
  ├─ scripts/snapshot-prices.mjs      per-TDU price snapshot for history charts
  └─ EFL parsing, three tiers, each handling what the last couldn't:
       ├─ scripts/parse-efls.mjs             Tier A — regex over extracted PDF text
       ├─ scripts/parse-efls-llamaparse.mjs  Tier B — LlamaParse on Tier-A failures
       └─ scripts/parse-efls-gemini.mjs      Tier C — Gemini on the remainder
                └─ Supabase (plans + plan_details)
                     └─ /api/recommend  weighted ranking engine
                          └─ /find/recommend  wizard UI
```

Each step is idempotent, so a re-run is always safe, and the snapshot runs even if ingest fails. EIA data (`scripts/fetch-eia-prices.mjs`, `scripts/fetch-eia-baseline.mjs`) supplies the market averages behind the historical-pricing factor and the price-history chart.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict |
| Styling | Tailwind v4, IBM Plex Sans + Mono, Bebas Neue |
| Database | Supabase (Postgres), service-role server-side only |
| Plan data | Power to Choose API + EFL PDF parsing (unpdf → LlamaParse → Gemini) |
| Usage estimation | WattBuy API |
| Market data | EIA open data |
| Ingestion | GitHub Actions daily cron |
| Animation | GSAP, Framer Motion, Lenis |
| Monitoring | PostHog analytics, Sentry error tracking |

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
| `ADMIN_TOKEN` | Bearer token for `POST /api/admin/revalidate` |
| `IP_HASH_SALT` | Salt for SHA-256 IP hashing |
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
npm run ingest:plans       # pull plans from Power to Choose
npm run parse:efls         # Tier A EFL parsing
npm run snapshot:prices    # per-TDU price snapshot
npm run fetch:eia-prices   # EIA market prices
npm run fetch:eia-baseline # EIA usage baseline
npm run rank:test          # exercise the ranking engine
```

## Project layout

```
app/
  page.tsx             landing page with the ZIP entry field
  find/recommend/      the wizard (profile → weights → results)
  (site)/              tools and content pages
  api/
    recommend/         weighted ranking endpoint
    usage-estimate/    WattBuy forecast proxy
    usage-baseline/    fallback usage profile
    price-history/     TDU price history for the results chart
    esid-lookup/       address → ESID
    zip-check/         ZIP validation + TDU resolution
    utility-for-zip/   TDU lookup for the utilities page
    ask-bot/           plan Q&A behind the compare dialog (Gemini, rate-limited)
    providers/         provider listing
    newsletter/        subscribe + token-signed unsubscribe
    admin/revalidate/  token-gated ISR flush after ingest
components/find/
  recommend-wizard.tsx wizard state machine
  recommend-client.ts  wizard state → /api/recommend request body
  steps/               questions (profile), weights, results
  plan-card.tsx        result card with score breakdown
  compare-dialog.tsx   side-by-side comparison
lib/
  ranking/             scoring engine — cost.ts, score.ts, recommend.ts, types.ts
  usage-profile/       usage shape modeling
  smt-csv.ts           client-side Smart Meter Texas CSV parser
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
