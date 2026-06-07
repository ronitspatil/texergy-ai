-- Automate Power-to-Choose ingestion entirely inside Supabase.
--
-- Background: the daily Vercel cron (/api/cron/daily) only ever took a price
-- snapshot of whatever was in `plans`; the actual PTC ingest lived in a
-- run-it-yourself script (scripts/ingest-plans.mjs). When nobody ran it, the
-- plans table — and every snapshot — froze (it sat on 2026-05-24 data for ~2
-- weeks). This migration moves ingestion onto a Supabase cron that invokes the
-- `ingest-plans` Edge Function (a Deno port of that script; source mirrored in
-- supabase/functions/ingest-plans/index.ts), which then calls snapshot_prices().
--
-- Applied to the live project via the management API on 2026-06-08; this file
-- is the version-controlled, idempotent record.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Server-only config store. RLS on with no policies => only the service role /
-- postgres can read it (anon & authenticated cannot). Holds the shared secret
-- the Edge Function checks against the caller's Bearer token.
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.app_config enable row level security;

insert into public.app_config (key, value)
values ('ingest_token', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- Set-based equivalent of scripts/snapshot-prices.mjs: aggregate active plans
-- per TDU into plan_price_snapshots. percentile_cont matches the script's
-- linear-interpolation median/percentiles. Idempotent on (snapshot_date,tdu_id).
create or replace function public.snapshot_prices(p_date date default (now() at time zone 'utc')::date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into plan_price_snapshots as t (
    snapshot_date, tdu_id, plan_count,
    avg_rate_500_kwh, avg_rate_1000_kwh, avg_rate_2000_kwh,
    median_rate_500_kwh, median_rate_1000_kwh, median_rate_2000_kwh,
    p25_rate_1000_kwh, p75_rate_1000_kwh,
    min_rate_1000_kwh, max_rate_1000_kwh
  )
  select
    p_date, tdu_id, count(*),
    round(avg(rate_500_kwh), 4), round(avg(rate_1000_kwh), 4), round(avg(rate_2000_kwh), 4),
    round(percentile_cont(0.5) within group (order by rate_500_kwh)::numeric, 4),
    round(percentile_cont(0.5) within group (order by rate_1000_kwh)::numeric, 4),
    round(percentile_cont(0.5) within group (order by rate_2000_kwh)::numeric, 4),
    round(percentile_cont(0.25) within group (order by rate_1000_kwh)::numeric, 4),
    round(percentile_cont(0.75) within group (order by rate_1000_kwh)::numeric, 4),
    round(min(rate_1000_kwh), 4), round(max(rate_1000_kwh), 4)
  from plans
  where active = true and tdu_id is not null
  group by tdu_id
  on conflict (snapshot_date, tdu_id) do update set
    plan_count = excluded.plan_count,
    avg_rate_500_kwh = excluded.avg_rate_500_kwh,
    avg_rate_1000_kwh = excluded.avg_rate_1000_kwh,
    avg_rate_2000_kwh = excluded.avg_rate_2000_kwh,
    median_rate_500_kwh = excluded.median_rate_500_kwh,
    median_rate_1000_kwh = excluded.median_rate_1000_kwh,
    median_rate_2000_kwh = excluded.median_rate_2000_kwh,
    p25_rate_1000_kwh = excluded.p25_rate_1000_kwh,
    p75_rate_1000_kwh = excluded.p75_rate_1000_kwh,
    min_rate_1000_kwh = excluded.min_rate_1000_kwh,
    max_rate_1000_kwh = excluded.max_rate_1000_kwh;

  get diagnostics n = row_count;
  return n;
end;
$$;

-- Daily ingest at 08:30 UTC (before the 09:00 Vercel snapshot cron, which now
-- acts as a fallback). The job reads the token from app_config at run time so
-- no secret is stored in cron.job.
select cron.unschedule('ingest-plans-daily')
where exists (select 1 from cron.job where jobname = 'ingest-plans-daily');

select cron.schedule(
  'ingest-plans-daily',
  '30 8 * * *',
  $cmd$
  select net.http_post(
    url := 'https://slgndvpojswdmmgrswrc.supabase.co/functions/v1/ingest-plans',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select value from public.app_config where key = 'ingest_token'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cmd$
);
