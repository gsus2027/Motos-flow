# Rastreo de motos con tags AT2501

## Qué se agregó

- `motos` ahora puede tener `tag_id` (el identificador que tú le pones al
  AT2501 de cada moto, ej. `AT2501-001`) y `plataforma` (`iphone` o
  `android`, según a qué celular está emparejado el tag).
- Tabla nueva `posiciones`: guarda cada posición registrada de una moto,
  con fecha/hora — de ahí sale tanto el punto "más reciente" como el
  historial completo (la ruta), igual que un GPS.
- Página nueva **Rastreo** (`/admin/rastreo`), visible para todo el staff:
  mapa con la última posición de cada moto que tenga tag asignado, y al
  hacer clic en una moto se dibuja su recorrido completo.
- En **Flota de motos**, cada moto ahora tiene un botón "Asignar tag" /
  "Editar tag" para ponerle su `tag_id` y su plataforma.

## Antes de usarlo: corre el SQL en Supabase

1. Entra a tu proyecto en supabase.com → **SQL Editor** → **New query**.
2. Pega el contenido de `supabase-schema-rastreo.sql` (está en la raíz del
   repo) y dale **Run**. Esto agrega las columnas nuevas a `motos` y crea
   la tabla `posiciones`. Es seguro correrlo aunque ya tengas datos: usa
   `if not exists` / `add column if not exists` en todo.

No hace falta ninguna variable de entorno nueva: la página usa las
mismas `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` que ya
tienes configuradas en Vercel.

## Cómo se alimenta el historial hoy

Por ahora, la única forma confiable de cargar posiciones es a mano, desde
"Rastreo" → "Registrar posición manual": alguien del staff abre en su
celular la app Buscar (iPhone) o Find Hub (Android), ve dónde está la
moto, y anota esas coordenadas ahí.

**Por qué no es automático:** ni Apple ni Google ofrecen una API pública
para leer la ubicación de un tag Find My/Find Hub desde fuera de su app
oficial (lo confirmé buscando en el foro de desarrolladores de Apple, sin
respuesta desde 2021, y no encontré nada equivalente para Find Hub). Así
que cualquier automatización es, en mayor o menor grado, un workaround no
oficial:

- **iPhone (experimental):** existe una librería no oficial, `findmy`
  (`pip install findmy`, repo `malmeloo/FindMy.py` en GitHub), que inicia
  sesión con un Apple ID y puede leer/decodificar reportes de ubicación
  sin necesitar el teléfono. No confirmé si funciona para un tag de
  terceros como el AT2501 (la llave de descifrado normalmente vive en el
  llavero de iCloud del iPhone que lo emparejó), y usarla implica loguear
  un Apple ID real desde un script — si lo prueban, usen un Apple ID
  aparte, nunca el personal/principal. Si en algún momento arman ese
  script, solo tiene que llamar a `POST /api/posiciones` (ver abajo) con
  la cookie de sesión del panel, o pueden adaptar la ruta para aceptar
  además una API key fija pensada para llamadas fuera del navegador.
- **Android:** no encontré ningún proyecto equivalente para Find Hub.
  Hoy por hoy, la carga manual es la única opción razonable.

## Si en el futuro migran a un GPS vehicular real

La tabla `posiciones` no le pertenece al AT2501: cualquier fuente puede
insertar ahí (un GPS con SIM propia, por ejemplo), siempre que mande
`moto_id` (o `tag_id`), `lat`, `lon` y opcionalmente `capturadoEn`. No
hay que tocar la página de Rastreo ni el resto del sistema — sigue
funcionando igual, solo cambia quién le manda los datos.

## Referencia rápida de la API

```
GET  /api/posiciones                  -> última posición de cada moto (requiere sesión de staff)
GET  /api/posiciones?motoId=<uuid>    -> historial completo de esa moto
POST /api/posiciones                  -> registrar una posición
     body: { motoId | tagId, lat, lon, precisionM?, fuente?, capturadoEn? }

PATCH /api/motos                      -> editar una moto (solo admin)
     body: { id, tagId?, plataforma?, placa?, modelo?, tipo? }
```
