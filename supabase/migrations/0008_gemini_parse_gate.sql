-- Tier C (Gemini) EFL extraction gate, mirroring llamaparse_source_url.
--
-- scripts/parse-efls-gemini.mjs stamps the efl_url it last submitted to
-- Gemini — success or failure — so the nightly run never re-spends quota on
-- the same unchanged PDF. A plan becomes eligible again only when PTC
-- publishes a new fact-sheet URL.

alter table public.plan_details
  add column if not exists gemini_source_url text;
