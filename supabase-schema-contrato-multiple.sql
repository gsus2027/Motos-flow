-- ============================================================
-- Migración: un contrato con varias motos / e-bikes (18-oct-2026)
-- Pega y ejecuta esto en: Supabase → SQL Editor → New query → Run
-- ANTES de publicar esta versión. No borra ni cambia nada existente,
-- y se puede volver a correr sin problema.
--
-- Cada vehículo sigue siendo su propia renta. Las que se agregan a un
-- contrato desde el Panel apuntan a la renta original con contrato_id
-- (la original lo tiene vacío). Ver lib/contratoMultiple.js.
-- ============================================================

alter table rentas add column if not exists contrato_id uuid references rentas(id) on delete set null;
alter table rentas add column if not exists agregado_por text;
alter table rentas add column if not exists agregado_en timestamptz;
create index if not exists idx_rentas_contrato on rentas(contrato_id);

alter table rentas_ebike add column if not exists contrato_id uuid references rentas_ebike(id) on delete set null;
alter table rentas_ebike add column if not exists agregado_por text;
alter table rentas_ebike add column if not exists agregado_en timestamptz;
create index if not exists idx_rentas_ebike_contrato on rentas_ebike(contrato_id);
