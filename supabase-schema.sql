-- ============================================================
-- Esquema de base de datos para Bitácora (control de renta de motos)
-- Pega y ejecuta esto completo en: Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists "pgcrypto";

-- Configuración del negocio (código de acceso del staff, etc.)
create table if not exists configuracion (
  clave text primary key,
  valor text not null
);

-- Flota de motos
create table if not exists motos (
  id uuid primary key default gen_random_uuid(),
  placa text not null,
  modelo text not null,
  tipo text not null default 'navi' check (tipo in ('navi', 'scooter')),
  creado_en timestamptz not null default now()
);

-- Rentas
create table if not exists rentas (
  id uuid primary key default gen_random_uuid(),
  moto_id uuid references motos(id) on delete set null,
  idioma text not null default 'es' check (idioma in ('es', 'en')),
  cliente text not null,
  cedula text not null,
  telefono text,
  hotel text,
  pais text,
  correo text,
  fecha_entrega date not null,
  hora_entrega time not null,
  fecha_prevista date not null,
  notas text,
  foto_carnet_url text,
  firma_cliente_url text,
  fecha_firma date,
  acepto_terminos boolean not null default false,
  estado text not null default 'activa' check (estado in ('activa', 'devuelta')),
  fecha_devolucion_real date,
  tarifa_total numeric(10,2),
  tarifa_regla text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_rentas_estado on rentas(estado);
create index if not exists idx_rentas_moto on rentas(moto_id);

-- Buckets de almacenamiento para fotos de carnet y firmas
insert into storage.buckets (id, name, public)
values ('carnets', 'carnets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('firmas', 'firmas', true)
on conflict (id) do nothing;

-- Seguridad a nivel de fila: lectura pública de motos disponibles,
-- pero las mutaciones solo pasan por las rutas de servidor (API routes)
-- usando la llave de servicio, así que RLS estricta es correcta aquí.
alter table motos enable row level security;
alter table rentas enable row level security;
alter table configuracion enable row level security;

-- Nadie puede leer/escribir directo desde el navegador; todo pasa por
-- las API routes del servidor, que usan la Service Role Key (la cual
-- ignora RLS). Por eso no se crean políticas públicas aquí.
