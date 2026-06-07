-- Retire the in-Supabase ingestion machinery from 0006_automate_ingest.sql.
--
-- The daily pipeline now runs as a GitHub Actions workflow
-- (.github/workflows/daily-data-pipeline.yml) which executes the canonical
-- scripts/*.mjs with an hours-long budget instead of pg_cron → Edge Function
-- under a 150s cap. The Vercel crons (/api/cron/daily, /api/cron/weekly-
-- llamaparse) are deleted in the same change.
--
-- Keeps: plan_price_snapshots (the historical time-series), cron_runs (audit
-- history), plan_details.source_url / llamaparse_source_url (the parse gates,
-- now stamped by the scripts).
--
-- The deployed `ingest-plans` Edge Function is not deletable via SQL; remove
-- it from the dashboard (Functions → ingest-plans → Delete). It is inert once
-- the cron below is unscheduled — it only ever ran when invoked with the
-- ingest_token, which this migration deletes.

select cron.unschedule('ingest-plans-daily')
where exists (select 1 from cron.job where jobname = 'ingest-plans-daily');

-- The set-based snapshot function existed for the Edge Function's benefit;
-- scripts/snapshot-prices.mjs computes the aggregates itself.
drop function if exists public.snapshot_prices(date);

-- app_config only ever held the Edge Function's shared secret.
drop table if exists public.app_config;
