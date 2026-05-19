-- Daily cron support: track which EFL URL each parse pass last consumed (so
-- we only re-parse when the PTC fact-sheet URL changes), and snapshot daily
-- per-TDU price aggregates for trend analysis.

------------------------------------------------------------------------
-- 1. plan_details: track the EFL URL each parser tier last attempted.
--
-- source_url            — URL the Tier A (text/regex) parser last consumed.
-- llamaparse_source_url — URL the Tier B (LlamaParse) parser last submitted.
--
-- Cron eligibility:
--   Tier A re-runs when plans.efl_url IS NOT NULL AND
--                       (plan_details row missing OR plan_details.source_url IS DISTINCT FROM plans.efl_url).
--   Tier B re-runs when plan_details.parse_errors is non-empty AND
--                       plans.efl_url IS DISTINCT FROM plan_details.llamaparse_source_url.
--
-- IS DISTINCT FROM treats nulls as values, so a plan that has never been
-- parsed (source_url IS NULL) is correctly flagged as eligible.
------------------------------------------------------------------------
alter table public.plan_details
  add column if not exists source_url            text,
  add column if not exists llamaparse_source_url text;

------------------------------------------------------------------------
-- 2. Daily price snapshots — one row per (snapshot_date, tdu) with the
--    distribution of active-plan headline rates at 500/1000/2000 kWh.
--
-- The cron computes avg / median / min / max / p25 / p75 / plan_count
-- across all active plans for the TDU on that date. Using numeric(7,4)
-- to match plans.rate_*_kwh storage precision.
------------------------------------------------------------------------
create table if not exists public.plan_price_snapshots (
  id                   bigint generated always as identity primary key,
  snapshot_date        date        not null,
  tdu_id               bigint      not null references public.tdus(id) on delete cascade,
  plan_count           int         not null,

  avg_rate_500_kwh     numeric(7,4),
  avg_rate_1000_kwh    numeric(7,4),
  avg_rate_2000_kwh    numeric(7,4),

  median_rate_500_kwh  numeric(7,4),
  median_rate_1000_kwh numeric(7,4),
  median_rate_2000_kwh numeric(7,4),

  p25_rate_1000_kwh    numeric(7,4),
  p75_rate_1000_kwh    numeric(7,4),

  min_rate_1000_kwh    numeric(7,4),
  max_rate_1000_kwh    numeric(7,4),

  created_at           timestamptz not null default now(),

  unique (snapshot_date, tdu_id)
);
create index if not exists idx_plan_price_snapshots_date     on public.plan_price_snapshots (snapshot_date desc);
create index if not exists idx_plan_price_snapshots_tdu_date on public.plan_price_snapshots (tdu_id, snapshot_date desc);

alter table public.plan_price_snapshots enable row level security;

------------------------------------------------------------------------
-- 3. cron_runs — audit log for cron invocations, separate from ingest_runs
--    so we can answer "did the cron fire yesterday, and what did it do".
------------------------------------------------------------------------
create table if not exists public.cron_runs (
  id            bigint generated always as identity primary key,
  job           text        not null,            -- 'daily' | 'weekly_llamaparse' | etc.
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text        not null default 'running' check (status in ('running','ok','partial','error')),
  result        jsonb,                            -- per-step counts (ingest, snapshot, parse)
  error_message text
);
create index if not exists idx_cron_runs_job_started on public.cron_runs (job, started_at desc);

alter table public.cron_runs enable row level security;
