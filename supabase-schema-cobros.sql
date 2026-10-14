-- ============================================================
-- Migración: cobros de rentas (cuadre de pagos, 13-oct-2026)
-- Pega y ejecuta esto en: Supabase → SQL Editor → New query → Run
-- ANTES de publicar esta versión. No borra ni cambia nada existente.
--
-- Hasta ahora una renta guardaba solo su total (tarifa_total), pero no
-- cómo ni cuándo se cobró. Cada fila de "cobros" es un pago real que
-- entró a caja: el cobro de la renta, el de una extensión, o un pago
-- parcial. Lo pagado de una renta = la suma de sus cobros; lo que falta
-- = tarifa_total − pagado.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists cobros (
  id uuid primary key default gen_random_uuid(),
  renta_tipo text not null check (renta_tipo in ('moto', 'ebike')),
  renta_id uuid not null,
  monto numeric(10,2) not null check (monto > 0),
  metodo text not null check (metodo in ('efectivo', 'tarjeta', 'yappy')),
  -- Últimos 4 dígitos del número de autorización del recibo BAC (tarjeta)
  -- o de la confirmación de Yappy. Null en efectivo.
  autorizacion_ult4 text check (autorizacion_ult4 is null or autorizacion_ult4 ~ '^[0-9]{4}$'),
  cobrado_por_id uuid,
  cobrado_por_nombre text,
  -- Si alguien corrige el método después (ej. marcaron Tarjeta y fue
  -- Efectivo), queda anotado quién y cuándo.
  corregido_por_nombre text,
  corregido_en timestamptz,
  creado_en timestamptz not null default now()
);

create index if not exists idx_cobros_renta on cobros(renta_tipo, renta_id);
create index if not exists idx_cobros_creado on cobros(creado_en);

alter table cobros enable row level security;
-- Igual que el resto de tablas: sin políticas públicas, todo pasa por
-- las API routes del servidor con la Service Role Key.
