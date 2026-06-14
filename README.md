# Texergy AI

AI-ranked electricity plan recommendations for Texas residents. Enter a ZIP code, set your priorities, and find the right plan in under a minute — free, no sign-up required.

Live at **[texergy.ai](https://texergy.ai)**.

## What it does

Texergy reads the fine print on every plan listed on Power to Choose — bill credits, tiered rates, TDU pass-throughs, early termination fees, renewable mix, base charges — and ranks them against what actually matters to you.

Three paths to a recommendation:

- **Smart Match** — answer a few questions, dial in weights for 7 factors (cost, renewable %, rate stability, etc.), get a ranked list in ~30 seconds
- **Basic Filters** — skip the questions; filter by rate type, term, and green percentage directly
- **Meter Upload** — drop in your Smart Meter Texas CSV and rank plans against your real 12-month usage instead of a kWh estimate

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router), React 19, TypeScript strict |
| Styling | Tailwind v4, IBM Plex Sans + Mono, Bebas Neue |
| Database | Supabase (Postgres), service-role server-side only |
| Plan data | Power to Choose scraping + EFL PDF parsing (LlamaParse + Gemini) |
| Usage estimation | WattBuy API (12-month forecast from ZIP + home size) |
| Ingestion pipeline | GitHub Actions daily cron + Supabase Edge Function |
| Email | Resend (newsletter confirmation, transactional) |
| Animation | GSAP (hero, footer), Framer Motion (wizard step transitions) |

## Architecture

```
GitHub Actions (daily cron)
  └─ scripts/ingest-ptc.mjs        scrapes Power to Choose
       └─ scripts/parse-efl.mjs    Tier A: regex · Tier B: LlamaParse · Tier C: Gemini
            └─ Supabase (plans + plan_details tables)
                 └─ /api/recommend weighted ranking engine
                      └─ /find/recommend multi-step wizard
```

## Key features

- **Ranking engine** — 7 weighted factors: cost, renewable %, rate stability, contract flexibility, bill transparency, historical pricing, and seasonal weather scoring
- **Smart Meter CSV upload** — rank plans against up to 13 months of real usage data
- **Plan comparator** — side-by-side dialog for up to 3 plans
- **Savings calculator** — estimate savings vs. your current rate
- **ESID lookup** — find your meter ID from address
- **WattBuy usage forecast** — 12-month kWh estimate by ZIP and home size
- **Content pages** — Texas Energy 101, FAQ, About, Blog with newsletter signup
- **SEO** — canonical URLs, BreadcrumbList JSON-LD, structured Organization/WebSite data, per-page sitemaps

## Quick start

```bash
npm install
cp .env.local.example .env.local
# Fill in the required variables (see table below), then:
npm run dev
# → http://localhost:3000
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key (client-side reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service-role key (server-side writes) |
| `ADMIN_TOKEN` | yes | Gates `/admin/*` routes |
| `IP_HASH_SALT` | yes | Salt for SHA-256 IP hashing (32-byte random string) |
| `WATTBUY_API_KEY` | yes | WattBuy usage estimation API |
| `NEWSLETTER_TOKEN_SECRET` | yes | Signs unsubscribe tokens |
| `LLAMA_PARSE_API_KEY` | no | LlamaParse PDF extraction (Tier B EFL parsing) |
| `GEMINI_API_KEY` | no | Gemini AI (Tier C EFL fallback) |
| `RESEND_API_KEY` | no | Newsletter confirmation emails |
| `WAITLIST_FROM_EMAIL` | no | From address for transactional email |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical origin (defaults to `https://texergy.ai`) |

Generate a random salt:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

## Project layout

```
app/
  (site)/              Marketing and content pages (FAQ, About, Blog, tools)
  find/recommend/      Multi-step recommendation wizard
  api/
    recommend/         Weighted plan ranking endpoint
    providers/         Electricity provider listing
    usage-estimate/    WattBuy usage forecast proxy
    newsletter/        Subscribe / unsubscribe
  admin/               Token-gated ingest admin and revalidation
components/
  find/                Wizard steps, plan cards, results sidebar, comparison dialog
  ui/                  shadcn/ui component library
lib/
  ranking.ts           Scoring engine (multi-factor, cliff detection, weather)
  db.ts                Supabase client and query helpers
  email.ts             Resend transactional email (newsletter)
  rate-limit.ts        In-memory token bucket per hashed IP
scripts/
  ingest-ptc.mjs       Power to Choose scraper
  parse-efl.mjs        EFL PDF parser (3-tier: regex → LlamaParse → Gemini)
```

## Security

- Same-origin check (`Referer` + `Origin`) on every POST endpoint
- In-memory rate limiting — 5 requests / hour / hashed IP
- IP stored as `SHA-256(salt + ip)` only; no raw IPs persisted
- Honeypot field on all public forms
- Admin routes use constant-time token comparison
- Hardened CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and Permissions-Policy in `next.config.ts`
- See [`SECURITY.md`](./SECURITY.md) for the full threat model

## License

MIT — see [`LICENSE`](./LICENSE).
