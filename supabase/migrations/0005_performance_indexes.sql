-- Performance indexes to support high-traffic recommendation queries.
--
-- The recommendation hot path runs:
--   SELECT … FROM plans WHERE active = true AND tdu_id IN (…)
-- plus secondary filters on rep_id, rate_type, renewable_pct, term_months.
-- Without indexes on these columns every request scans the full plans table.
--
-- service_areas is read on every ZIP lookup (cold start only, but it's the
-- first query in the pipeline). Indexing zip speeds up the cache-hit path.

-- Primary hot path: active + TDU filter
CREATE INDEX IF NOT EXISTS idx_plans_active_tdu
  ON plans (active, tdu_id);

-- Provider filter (used when user narrows by REP in the sidebar)
CREATE INDEX IF NOT EXISTS idx_plans_rep_id
  ON plans (rep_id);

-- Rate type filter
CREATE INDEX IF NOT EXISTS idx_plans_rate_type
  ON plans (rate_type);

-- Renewable filter
CREATE INDEX IF NOT EXISTS idx_plans_renewable_pct
  ON plans (renewable_pct);

-- Term filter
CREATE INDEX IF NOT EXISTS idx_plans_term_months
  ON plans (term_months);

-- ZIP lookup in service_areas (cache-hit path on every recommend call)
CREATE INDEX IF NOT EXISTS idx_service_areas_zip
  ON service_areas (zip);

-- Snapshot prices: historical scoring reads the latest N rows per TDU
CREATE INDEX IF NOT EXISTS idx_price_snapshots_tdu_captured
  ON price_snapshots (tdu_id, captured_at DESC);
