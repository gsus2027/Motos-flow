-- Cobertura y extras para rentas de moto y ebike.
-- Pega y ejecuta esto en: Supabase → SQL Editor → New query → Run

-- Motos: cobertura (básica/premium) + su precio congelado al momento de la renta
alter table rentas add column if not exists cobertura text not null default 'basica' check (cobertura in ('basica', 'premium'));
alter table rentas add column if not exists cobertura_precio numeric(10,2) not null default 0;

-- Motos y ebikes: extras seleccionados, guardados como lista con su precio
-- congelado y si ya se devolvió cada uno. Ejemplo:
-- [{"id":"bocina","nombre":"Bocina bluetooth","precio":5,"devuelto":null}]
alter table rentas add column if not exists extras jsonb not null default '[]'::jsonb;
alter table rentas_ebike add column if not exists extras jsonb not null default '[]'::jsonb;

-- Configuración de precios de extras y cobertura premium (se lee/edita
-- desde el panel → Extras y coberturas). Valor por defecto de arranque:
insert into configuracion (clave, valor)
values ('extras_coberturas', '{
  "coberturaPremium": 10,
  "extras": [
    {"id": "snorkel", "nombre": "Snorkel", "precioMoto": 5, "notaMoto": "2x snorkel", "precioEbike": 2, "notaEbike": "1x snorkel"},
    {"id": "rack", "nombre": "Rack para tabla de surf", "precioMoto": 5, "precioEbike": 5},
    {"id": "bocina", "nombre": "Bocina bluetooth", "precioMoto": 5, "precioEbike": 5},
    {"id": "tienda", "nombre": "Tienda de campaña", "precioMoto": 10, "precioEbike": 10}
  ]
}')
on conflict (clave) do nothing;
