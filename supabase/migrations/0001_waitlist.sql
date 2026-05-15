-- Waitlist table.
--
-- RLS is enabled with no policies, so the anon/auth keys cannot read or write.
-- All access goes through the server using the service-role key, which bypasses
-- RLS. The API route (app/api/waitlist/route.ts) validates input before insert.

create table if not exists public.waitlist (
  id          bigint generated always as identity primary key,
  email       text        not null unique,
  zip         text,
  referrer    text,
  created_at  timestamptz not null default now(),
  ip_hash     text
);

create index if not exists idx_waitlist_created on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;
