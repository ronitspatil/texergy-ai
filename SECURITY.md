# Security

## Reporting a vulnerability

Email **hello@texergy.ai** with the subject `Security: <short description>`. Please do not open public issues for vulnerabilities.

Acknowledgement target: 2 business days. Fix target: depends on severity, generally < 14 days for high/critical issues.

## Attack surface

Texergy is a read-mostly public site. It requires no accounts and stores almost nothing about visitors. The pieces worth defending:

| Surface | Notes |
|---|---|
| `POST /api/recommend` | Ranking engine. No persistence, but it's the most-called route and reads the full plan set. |
| `POST /api/newsletter/subscribe` | The only endpoint that writes user PII (an email address). |
| `GET /unsubscribe` | Consumes an HMAC-signed token; no auth required by design. |
| `POST /api/ask-bot` | Proxies to Gemini. Abuse here burns paid quota, not just cycles. |
| `POST /api/admin/revalidate` | Token-gated ISR flush. |
| Ingestion scripts | Run in GitHub Actions with the service-role key; never exposed to the browser. |

Meter CSV uploads are parsed in the browser and never leave the client, so they are not part of the server attack surface.

## Threat model & mitigations

| Threat | Mitigation |
|---|---|
| Cross-site form abuse / CSRF | Same-origin check (`Origin` + `Referer` must match `Host`) via `lib/request-guard.ts` on every POST route. No cookies are read by any API, but the check is kept for defense in depth. |
| Email enumeration | Subscribe returns an identical `{ok:true}` whether the address is new, reactivated, or already subscribed. A re-confirmation email is only sent on insert or reactivation. |
| Spam / bot signups | (1) Honeypot field — tripped requests return success without a DB write. (2) In-memory rate limit, 5 / hour / hashed IP. |
| Gemini quota exhaustion | Two-tier limit on `/api/ask-bot`: 10 / hour / hashed IP plus a global 300 / 24h ceiling. Enforced in development too, so local loops can't drain the quota. |
| Payload-size abuse | Request bodies are read as text and rejected above a per-route cap (4 KB on subscribe) before JSON parsing. Content-type must be `application/json`. |
| Malformed input | Every POST body is validated with a zod schema (`lib/validation.ts`) before it reaches the DB or an external API. |
| Sensitive data at rest | Only an email address, an optional source label, and a hashed IP. **Raw IPs are never stored** — only `SHA-256(IP_HASH_SALT \|\| ip)`. |
| Injection | All DB access goes through the Supabase JS client's query builder; no user input is interpolated into SQL or a shell command. |
| Broad DB access from the browser | The anon key is not used. Every table has RLS enabled with zero policies, and all reads/writes happen server-side with the service-role key, which never reaches the client bundle. |
| Unsubscribe-link forgery | Unsubscribe tokens are HMAC-SHA256 signed with `NEWSLETTER_TOKEN_SECRET` (`lib/newsletter-token.ts`). An unsigned or tampered token is rejected. |
| XSS via email content | Email HTML is built from a static template; user-supplied strings are escaped before insertion. |
| PII in server logs | The subscribe route logs only the Resend message id on success, never the email address. Errors log a generic message; stack traces stay server-side. |
| Token leakage in URLs | `Referrer-Policy: no-referrer` is set on `/admin/*` so a token in a query string can't leak via the Referer header. |
| Weak admin tokens | `adminTokenMatches` uses `timingSafeEqual` and rejects any `ADMIN_TOKEN` shorter than 24 characters rather than silently accepting it. |
| Cache poisoning / stale state | All `/api/*` and `/admin/*` responses set `Cache-Control: no-store, max-age=0`. |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`. |
| Mixed-content / TLS downgrade | `Strict-Transport-Security` with `preload`. |
| MIME sniffing | `X-Content-Type-Options: nosniff`. |
| Sensitive browser APIs | `Permissions-Policy: camera=(), microphone=(), geolocation=()`. |
| Search-engine indexing of admin / API | `app/robots.ts` disallows `/admin/` and `/api/`, plus `X-Robots-Tag: noindex, nofollow, noarchive` on every admin response. |
| Dependency CVEs | `postcss` is pinned to `^8.5.13` via `overrides` to displace Next's older transitive dep (GHSA-qx2v-qp2m-jg93). Dependabot watches the rest. |

## Residual trade-offs (acknowledged, not "fixed")

- **Email enumeration via timing.** A new signup awaits a Supabase write plus a Resend send; an existing subscriber returns almost immediately. Response time therefore leaks whether an address is already on the list. Padding every response to the slow path would burn function-time budget on every request, and the 5/hour rate limit caps how many addresses an attacker can probe.
- **In-memory rate limiting on serverless.** The token bucket lives in process memory, so each Vercel instance keeps its own counts and a cold-start storm can exceed the nominal per-IP cap. Moving to a shared store (Upstash Redis, a Supabase `ratelimit` table) is the fix if abuse becomes real.
- **Third-party data trust.** Plan data is scraped from Power to Choose and parsed out of provider EFL PDFs. A malformed or adversarial EFL yields wrong numbers rather than code execution, but the ranking is only as good as the source documents.

## What we explicitly do NOT defend against

- **Sophisticated bots** that solve the honeypot by inspecting CSS. Add Turnstile or hCaptcha if signups become a target.
- **Spoofed `X-Forwarded-For` upstream of the rate limiter.** Vercel sanitizes XFF before our code runs, so this is fine on Vercel. On any other host, deploy behind a CDN that sets a trusted XFF.
- **Database disclosure via host compromise.** The service-role key grants full read/write and bypasses RLS. Treat it like a password.

## Operational hygiene

- Rotate `ADMIN_TOKEN` and `IP_HASH_SALT` if anyone outside the trust boundary has seen them.
- Rotate `SUPABASE_SERVICE_ROLE_KEY` from the Supabase dashboard if it appears in any chat, screenshot, log, or error report. Rotating it requires updating the GitHub Actions secret and the Vercel env var.
- Rotating `NEWSLETTER_TOKEN_SECRET` invalidates every unsubscribe link already sent, so only do it in response to a leak.
- Rotate `RESEND_API_KEY` and `GEMINI_API_KEY` on the same trigger.
- Delete subscriber records on user request; `email` is unique on `newsletter_subscribers`, so deletion is a single-row operation.
- Periodically run `npm audit` (or rely on Dependabot) and apply dependency patches.
