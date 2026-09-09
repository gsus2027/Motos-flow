-- ============================================================
-- Migración: hace privadas las fotos de carnet y las firmas
-- Pega y ejecuta esto en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Antes, cualquiera con el link directo podía ver una foto o firma sin
-- pasar por el código de acceso del panel. Con esto, esos archivos dejan
-- de ser públicos: solo se pueden ver generando un link temporal desde
-- el servidor (después de validar el código del equipo).
update storage.buckets set public = false where id in ('carnets', 'firmas');

-- Nota: las fotos/firmas de rentas de PRUEBA que ya subiste antes de este
-- cambio quedarán con un link roto (se guardó como URL pública completa,
-- no como ruta). Las rentas NUEVAS que se registren después de subir el
-- código actualizado funcionarán correctamente. Si quieres, puedes borrar
-- esas rentas de prueba desde la tabla "rentas" / "rentas_ebike" en
-- Supabase (Table Editor) — no afecta nada más.
