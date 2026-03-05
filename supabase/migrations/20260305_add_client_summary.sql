-- Adds persisted client summary for Phase 4 outputs.
alter table public.estimations
  add column if not exists client_summary jsonb;
