-- ============================================================
-- Migración: agrega soporte para renta de Ebikes (bicicletas eléctricas)
-- Pega y ejecuta esto en: Supabase → SQL Editor → New query → Run
-- (Se agrega a lo que ya tenías, no borra nada existente)
-- ============================================================

create extension if not exists "pgcrypto";

-- Flota de ebikes (mucho más simple que motos: no tienen "tipo" de tarifa,
-- todas cuestan lo mismo por día)
create table if not exists ebikes (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  creado_en timestamptz not null default now()
);

-- Rentas de ebikes
create table if not exists rentas_ebike (
  id uuid primary key default gen_random_uuid(),
  ebike_id uuid references ebikes(id) on delete set null,
  idioma text not null default 'es' check (idioma in ('es', 'en')),
  cliente text not null,
  cedula text not null,
  telefono text,
  hotel text,
  pais text,
  correo text,
  fecha_entrega date not null,
  fecha_prevista date not null,
  notas text,
  foto_carnet_url text,
  firma_cliente_url text,
  fecha_firma date,
  acepto_terminos boolean not null default false,
  estado text not null default 'activa' check (estado in ('activa', 'devuelta')),
  fecha_devolucion_real date,
  tarifa_total numeric(10,2),
  creado_en timestamptz not null default now()
);

create index if not exists idx_rentas_ebike_estado on rentas_ebike(estado);
create index if not exists idx_rentas_ebike_ebike on rentas_ebike(ebike_id);

alter table ebikes enable row level security;
alter table rentas_ebike enable row level security;
-- Igual que las tablas de motos: sin políticas públicas, todo pasa por
-- las API routes del servidor con la Service Role Key.
