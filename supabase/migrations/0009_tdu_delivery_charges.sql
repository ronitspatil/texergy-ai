-- Canonical per-TDU delivery charges.
--
-- Every Texas TDU bills a regulated delivery charge (a volumetric ¢/kWh plus a
-- fixed monthly customer charge) that is identical across every REP's plans in
-- that service territory. Roughly a third of EFLs don't yield those numbers to
-- the parser, and pricing those plans without delivery understates a bill by
-- about half — see lib/ranking/cost.ts.
--
-- Rather than track five utilities' tariff sheets by hand, we derive the
-- canonical pair from the EFLs that *did* parse: within one TDU the parsed
-- values cluster hard on a single mode (e.g. Oncor: 6.0295¢ in 65 of 113
-- plans), with the minority values being older tariff vintages. The mode is
-- therefore the current tariff, and it re-derives itself after each tariff
-- change as REPs reissue EFLs. scripts/derive-tdu-charges.mjs does the work and
-- runs nightly after EFL parsing.
--
-- One row per TDU; the deriver upserts.

create table if not exists public.tdu_delivery_charges (
  tdu_id          integer primary key references public.tdus (id) on delete cascade,
  per_kwh_cents   numeric(8, 4) not null check (per_kwh_cents > 0),
  per_month_usd   numeric(8, 2) not null check (per_month_usd >= 0),
  -- Provenance for the derived pair: how many parsed EFLs were considered and
  -- how many of them agreed on the winning value. A low agreement share means
  -- a tariff change is mid-rollout and the value is worth an eyeball.
  sample_size     integer not null check (sample_size > 0),
  agreement_pct   numeric(5, 2) not null check (agreement_pct between 0 and 100),
  source          text not null default 'derived_from_efls',
  derived_at      timestamptz not null default now()
);

comment on table public.tdu_delivery_charges is
  'Canonical delivery charge per TDU, derived nightly from parsed EFLs. Used to price plans whose own EFL parse lost the delivery table.';

-- Read-only to anon/authenticated; all app access is service-role server-side,
-- matching the rest of the schema.
alter table public.tdu_delivery_charges enable row level security;
