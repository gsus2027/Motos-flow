-- ============================================================
-- Migración: rol de super administrador (acceso al módulo de dinero)
-- Pega y ejecuta esto en: Supabase → SQL Editor → New query → Run
-- (Solo hazlo si ya corriste antes supabase-schema-staff.sql)
-- ============================================================

alter table staff add column if not exists es_admin boolean not null default false;

-- A todo el que ya tengas registrado como staff lo marcamos administrador
-- por ahora (para que nadie se quede afuera del módulo nuevo). Desde la
-- pantalla "Equipo" puedes después quitarle ese permiso a quien no lo
-- necesite, dejando el módulo de dinero solo para quien tú decidas.
update staff set es_admin = true;
