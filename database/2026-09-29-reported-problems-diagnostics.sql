-- Nethor — enrichissement des problèmes signalés
-- 2026-09-29

alter table public.reported_problems
  add column if not exists app_version text,
  add column if not exists diagnostics jsonb not null default '{}'::jsonb;

comment on column public.reported_problems.app_version is
  'Version Nethor visible au moment du signalement';

comment on column public.reported_problems.diagnostics is
  'Contexte technique client non sensible joint au signalement';
