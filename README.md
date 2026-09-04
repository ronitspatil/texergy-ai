# Texergy AI

Ranks Texas retail electricity plans by what you actually care about. Type a ZIP, say what matters, get real plans with projected monthly bills. Free, no sign-up.

Live at [texergy.ai](https://texergy.ai).

## Why

The cents-per-kWh number on a plan listing is close to meaningless. What decides your bill is buried in the Electricity Facts Label: bill credits that only pay out above a usage threshold, tier cliffs at 500/1000/2000 kWh, TDU delivery charges, base charges, early termination fees.

Texergy parses those EFLs nightly and projects what each plan would cost at your usage, then scores them on seven factors you control.

## Using it

Enter a ZIP on the home page. That resolves your TDU, which decides both the plan set and the delivery charges. Non-deregulated ZIPs are rejected before anything else happens.

From there it's three steps: profile, weights, results.

The profile step only really needs your usage. Pick a preset (roughly 500 kWh for an apartment, 1000 for an average home, 2000 for a large one), type your own number, or hit "Estimate my usage" for a 12-month WattBuy forecast built from your ZIP and home size. You can also tell it what's in your home (thermostat, EV, solar, battery), and set a rate type, renewable minimum, or contract length.

If you have Smart Meter Texas data, upload it in the usage field. Log in at [smartmetertexas.com](https://www.smartmetertexas.com), request an interval-data report, and drop in the `IntervalData.csv` they email you. Up to 13 months of 15-minute intervals. Parsing happens in your browser, so the file never touches the server.

Then the weights. Seven factors, and you can either answer a short quiz to get a starting set or go straight to the sliders. Default split is 35/10/10/15/10/10/10.

| Factor | Rewards |
|---|---|
| Cost | Lower projected bill at your usage |
| Renewable | Higher renewable content |
| Flexibility | Low ETF, short terms |
| Rate preference | Plans matching your preferred rate type |
| Historical pricing | Plans under the EIA Texas residential trailing-12-month average |
| Seasonality | Fixed plans covering summer and winter spike windows, and penalizes Variable plans for the same exposure |
| Bill transparency | Plans whose bill tracks the advertised rate, and penalizes credits, minimum-usage fees, and tier cliffs |

Results come back as cards. Each one shows the projected bill, the per-factor score breakdown, and the fine print behind it. Sort by match, rate, term, bill, or ETF. Compare up to three plans side by side and ask a plain-English question about them. There are also charts for your usage forecast and for your TDU's price history against the EIA average. Signing up happens on the provider's site. Texergy doesn't sell plans or take commissions.

## Other pages

- [/savings-calculator](https://texergy.ai/savings-calculator), savings against your current rate
- [/usage-calculator](https://texergy.ai/usage-calculator), kWh estimate from home size and appliances
- [/esid-lookup](https://texergy.ai/esid-lookup), find your meter's ESID from an address
- [/electricity-providers](https://texergy.ai/electricity-providers), [/electric-utilities](https://texergy.ai/electric-utilities), [/service-areas](https://texergy.ai/service-areas), who serves what
- [/texas-energy-101](https://texergy.ai/texas-energy-101), how the deregulated market works

## Data pipeline

```
GitHub Actions (daily, 08:30 UTC)
  ├─ ingest-plans.mjs          Power to Choose API → reps/plans/tdus
  ├─ snapshot-prices.mjs       per-TDU price snapshot for the history charts
  ├─ EFL parsing, three tiers, each picking up what the last one missed:
  │    ├─ parse-efls.mjs             regex over extracted PDF text
  │    ├─ parse-efls-llamaparse.mjs  LlamaParse on the failures
  │    └─ parse-efls-gemini.mjs      Gemini on what's left
  └─ derive-tdu-charges.mjs    canonical delivery charge per TDU
       └─ Supabase (plans, plan_details, tdu_delivery_charges)
            └─ /api/recommend        ranking engine
                 └─ /find/recommend  the wizard
```

Every step is idempotent, so re-running is always safe, and the snapshot still runs if ingest fails. EIA data (`fetch-eia-prices.mjs`, `fetch-eia-baseline.mjs`) feeds the historical-pricing factor and the price chart.

A note on pricing, since it's the part most likely to bite you: a plan is priced from its own parsed EFL when that parse is complete, from its EFL plus its TDU's canonical delivery charge when the delivery table didn't parse, and from PTC's published average otherwise. Parsed bills get cross-checked against that published average, because an EFL that loses its delivery table understates a Texas bill by about half. See `lib/ranking/cost.ts`.

## Stack

Next.js 16 (App Router), React 19, TypeScript strict. Tailwind v4 with IBM Plex Sans and Mono, Bebas Neue for display. Supabase Postgres, service-role and server-side only. Plan data from the Power to Choose API plus EFL PDF parsing (unpdf, then LlamaParse, then Gemini). WattBuy for usage estimation, EIA for market data, GitHub Actions for the nightly job. GSAP, Framer Motion and Lenis for animation. PostHog and Sentry for analytics and errors.

## Running locally

```bash
npm install
cp .env.local.example .env.local
# fill in the required variables, then:
npm run dev
```

Required:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key, server-side only |
| `ADMIN_TOKEN` | Bearer token for `POST /api/admin/revalidate` |
| `IP_HASH_SALT` | Salt for SHA-256 IP hashing |
| `NEWSLETTER_TOKEN_SECRET` | Signs unsubscribe tokens |

Optional:

| Variable | Enables |
|---|---|
| `WATTBUY_API_KEY` | Usage estimation, falls back to manual entry when unset |
| `GEMINI_API_KEY` | Plan Q&A and the Gemini parse tier |
| `LLAMA_CLOUD_API_KEY` | The LlamaParse tier |
| `EIA_API_KEY` | Market price and baseline fetches |
| `RESEND_API_KEY`, `WAITLIST_FROM_EMAIL` | Transactional email |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, defaults to `https://texergy.ai` |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN` | Analytics, error tracking |

Everything optional degrades quietly when its key is missing, so a minimal setup only needs the required five. Generate the random ones with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Pipeline scripts:

```bash
npm run ingest:plans        # pull plans from Power to Choose
npm run parse:efls          # first-tier EFL parsing
npm run derive:tdu-charges  # canonical per-TDU delivery charges
npm run snapshot:prices     # per-TDU price snapshot
npm run fetch:eia-prices    # EIA market prices
npm run fetch:eia-baseline  # EIA usage baseline
npm run rank:test           # exercise the ranking engine
```

## Layout

```
app/
  page.tsx             landing page, ZIP entry
  find/recommend/      the wizard
  (site)/              tools and content pages
  api/
    recommend/         ranking endpoint
    usage-estimate/    WattBuy proxy
    usage-baseline/    fallback usage profile
    price-history/     TDU price history
    esid-lookup/       address → ESID
    zip-check/         ZIP validation, TDU resolution
    utility-for-zip/   TDU lookup for the utilities page
    ask-bot/           plan Q&A, rate-limited
    providers/         provider listing
    newsletter/        subscribe, token-signed unsubscribe
    admin/revalidate/  token-gated ISR flush
components/find/
  recommend-wizard.tsx  wizard state machine
  recommend-client.ts   wizard state → request body
  steps/                profile, weights, results
  plan-card.tsx         card with score breakdown
  compare-dialog.tsx    side-by-side comparison
lib/
  ranking/           cost.ts, score.ts, recommend.ts, types.ts
  usage-profile/     usage shape modeling
  smt-csv.ts         client-side Smart Meter Texas parser
  price-history.ts   EIA and snapshot series
  db.ts              Supabase client and queries
  rate-limit.ts      token bucket per hashed IP
  request-guard.ts   same-origin checks, IP hashing
scripts/             ingestion and parsing jobs
```

## Security

Every POST endpoint checks `Referer` and `Origin`. Rate limiting is in-memory, keyed on a hashed IP, and raw IPs are never stored (`SHA-256(salt + ip)` only). Meter CSVs are parsed in the browser and never uploaded. Admin routes compare tokens in constant time. CSP, HSTS, X-Frame-Options, X-Content-Type-Options and Permissions-Policy are set in `next.config.ts`.
