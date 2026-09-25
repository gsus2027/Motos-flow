-- ============================================================
-- Rastreo de motos (posición + historial tipo GPS a partir de
-- los tags AT2501, o de cualquier otra fuente en el futuro).
-- Pega y ejecuta esto en: Supabase → SQL Editor → New query → Run
-- (después de haber corrido supabase-schema.sql, que ya crea "motos")
-- ============================================================

-- Cada moto puede tener asociado el identificador del tag AT2501 que
-- trae puesto, y en qué celular está emparejado ese tag (determina cómo
-- se puede consultar su posición: Buscar en iPhone, o Find Hub en
-- Android). Ambas columnas son opcionales: una moto sin tag_id
-- simplemente no aparece en el mapa de rastreo todavía.
alter table motos add column if not exists tag_id text unique;
alter table motos add column if not exists plataforma text check (plataforma in ('iphone', 'android'));

-- Historial de posiciones: un renglón por cada vez que se registra dónde
-- estaba una moto. De aquí sale tanto el punto "más reciente" (para el
-- mapa en vivo) como la ruta completa (para ver el recorrido, como un
-- GPS).
create table if not exists posiciones (
  id uuid primary key default gen_random_uuid(),
  moto_id uuid not null references motos(id) on delete cascade,
  lat double precision not null,
  lon double precision not null,
  precision_m numeric,
  -- de dónde salió el dato: manual (alguien lo anotó viendo Buscar/Find
  -- Hub), script_experimental_iphone (automatización), gps_real (si en
  -- el futuro se migra a un GPS vehicular con API propia), etc.
  fuente text not null default 'manual',
  capturado_en timestamptz not null,   -- cuándo se vio esa posición
  recibido_en timestamptz not null default now()  -- cuándo llegó al sistema
);

create index if not exists idx_posiciones_moto_capturado
  on posiciones(moto_id, capturado_en desc);

-- Misma política que el resto de la base: RLS activada, sin políticas
-- públicas. Todo pasa por las API routes del servidor (Service Role Key),
-- nunca directo desde el navegador.
alter table posiciones enable row level security;
