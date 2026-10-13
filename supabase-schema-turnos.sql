-- ============================================================
-- Migración: turnos de caja (cuadre de pagos, etapa 3, 13-oct-2026)
-- Pega y ejecuta esto en: Supabase → SQL Editor → New query → Run
-- ANTES de publicar esta versión (y después de supabase-schema-cobros.sql).
--
-- Un turno = el tiempo en que UNA persona tiene la caja.
--   - Al empezar cuenta el efectivo que le dejaron (fondo_inicial). Si no
--     coincide con lo que dejó el anterior, la diferencia queda en
--     diferencia_al_recibir (se le atribuye al turno anterior).
--   - Al cerrar cuenta otra vez (efectivo_contado). Debe haber: fondo +
--     efectivo cobrado en el turno − salidas. La diferencia queda guardada.
-- Solo puede haber UN turno abierto a la vez.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists turnos (
  id uuid primary key default gen_random_uuid(),
  caja text not null default 'principal',
  usuario_id uuid not null,
  usuario_nombre text not null,
  abierto_en timestamptz not null default now(),
  cerrado_en timestamptz,
  turno_anterior_id uuid references turnos(id),
  entregado_por_anterior numeric(10,2),
  fondo_inicial numeric(10,2) not null default 0,
  diferencia_al_recibir numeric(10,2),
  efectivo_cobrado numeric(10,2),
  salidas numeric(10,2) not null default 0,
  salidas_nota text,
  efectivo_esperado numeric(10,2),
  efectivo_contado numeric(10,2),
  diferencia numeric(10,2),
  cerrado_por_nombre text,
  nota_cierre text
);

create unique index if not exists idx_turnos_uno_abierto on turnos(caja) where cerrado_en is null;
create index if not exists idx_turnos_abierto_en on turnos(abierto_en);

alter table turnos enable row level security;
-- Sin políticas públicas: todo pasa por las API routes del servidor.
