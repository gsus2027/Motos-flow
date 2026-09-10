-- ============================================================
-- Migración: bucket privado para los respaldos automáticos
-- Pega y ejecuta esto en: Supabase → SQL Editor → New query → Run
-- ============================================================

insert into storage.buckets (id, name, public)
values ('respaldos', 'respaldos', false)
on conflict (id) do nothing;
