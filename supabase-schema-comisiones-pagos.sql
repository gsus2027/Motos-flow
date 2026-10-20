-- Pagos parciales de comisiones (20-oct-2026)
--
-- Antes: se pagaba "cerrando un periodo" para todo el equipo a la vez.
-- Ahora: el administrador le paga a cada miembro el monto que quiera,
-- cuando quiera. Cada miembro tiene un saldo que corre siempre:
--   saldo = comisiones ganadas − pagos (no anulados)
--
-- Los periodos ya cerrados con el sistema anterior (comision_periodos)
-- se quedan como están: sus rentas siguen marcadas como pagadas y no
-- vuelven a contar, y siguen apareciendo en el historial del administrador.
--
-- Ejecuta este archivo UNA vez en Supabase → SQL Editor antes de subir
-- el código. Es seguro ejecutarlo más de una vez.

create table if not exists comision_pagos (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id),
  monto numeric(10, 2) not null check (monto > 0),
  forma text not null default 'efectivo',
  nota text,
  fecha date not null,
  pagado_por text,
  creado_en timestamptz not null default now(),
  anulado boolean not null default false,
  anulado_en timestamptz,
  anulado_por text
);

create index if not exists comision_pagos_staff_idx on comision_pagos (staff_id) where not anulado;
create index if not exists comision_pagos_creado_idx on comision_pagos (creado_en desc);

-- Solo el servidor (service role) lee y escribe esta tabla. Sin políticas,
-- nadie con la llave pública puede verla.
alter table comision_pagos enable row level security;
