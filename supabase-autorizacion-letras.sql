-- ============================================================================
-- Autorización con números y letras (14-oct-2026)
--
-- Pega y ejecuta esto completo en: Supabase (proyecto de Flow Rentals) →
-- SQL Editor → New query → Run, ANTES de publicar esta versión.
--
-- Algunos recibos traen letras en la autorización: se aceptan los últimos 4
-- caracteres, números o letras (antes solo números). No borra datos. Se
-- puede correr más de una vez.
-- ============================================================================

do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'cobros'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%autorizacion_ult4%'
  loop
    execute format('alter table cobros drop constraint %I', r.conname);
  end loop;
end $$;

alter table cobros add constraint cobros_autorizacion_ult4_check
  check (autorizacion_ult4 is null or autorizacion_ult4 ~ '^[0-9A-Z]{4}$');
