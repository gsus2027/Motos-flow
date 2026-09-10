-- ============================================================
-- Migración: cuentas individuales de staff (reemplaza el código único)
-- Pega y ejecuta esto en: Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  pin_hash text not null,
  pin_salt text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table staff enable row level security;
-- Igual que el resto de tablas: nadie lee/escribe directo desde el
-- navegador, todo pasa por las API routes del servidor.

-- El código compartido anterior ya no se usa — se puede borrar sin
-- ningún problema (los PINs nuevos viven en la tabla "staff" de arriba).
delete from configuracion where clave = 'admin_pin';

-- Para que los nombres de quién atendió cada renta se puedan guardar:
alter table rentas add column if not exists atendido_por text;
alter table rentas_ebike add column if not exists atendido_por text;
