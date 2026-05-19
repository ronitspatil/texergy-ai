-- Newsletter subscriptions. Separate from waitlist: the waitlist captures
-- early-access intent (one signup per user), the newsletter is an ongoing
-- mailing list with explicit unsubscribe support.

create table if not exists public.newsletter_subscribers (
  id              bigint generated always as identity primary key,
  email           text        not null unique,
  source          text,                            -- e.g. 'blog', 'footer', 'embed'
  ip_hash         text,                            -- SHA256(IP_HASH_SALT:ip), for abuse triage
  subscribed_at   timestamptz not null default now(),
  unsubscribed_at timestamptz,                     -- null = active
  confirmed_at    timestamptz                      -- reserved for future double-opt-in
);
create index if not exists idx_newsletter_subscribed_at on public.newsletter_subscribers (subscribed_at desc);
create index if not exists idx_newsletter_active        on public.newsletter_subscribers (unsubscribed_at) where unsubscribed_at is null;

alter table public.newsletter_subscribers enable row level security;
