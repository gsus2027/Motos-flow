import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { randomUUID } from "crypto";
import { limitadorEscritura, ipDelRequest, verificarLimite } from "@/lib/ratelimit";

// POST: pública — recibe una imagen en base64 (dataURL) y la sube al
// bucket correspondiente ("carnets" o "firmas"), que son privados. Devuelve
// la RUTA del archivo (no un link público) — para ver la imagen después,
// hay que pedir un link temporal desde /api/imagen-firmada, que solo
// funciona si ya entraste con el código del panel.
export async function POST(req) {
  const { exito } = await verificarLimite(limitadorEscritura, ipDelRequest(req));
  if (!exito) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." }, { status: 429 });
  }

  const { dataUrl, tipo } = await req.json();
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Imagen inválida." }, { status: 400 });
  }
  const bucket = tipo === "firma" ? "firmas" : "carnets";

  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return NextResponse.json({ error: "Formato de imagen inválido." }, { status: 400 });
  const [, mimeDeclarado, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  // Límite de tamaño razonable (5 MB) para evitar abuso
  if (buffer.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "La imagen es demasiado grande." }, { status: 413 });
  }

  // No confiamos en el "image/xxx" que manda el navegador (se puede
  // falsificar fácilmente) — revisamos los primeros bytes reales del
  // archivo para confirmar que de verdad es una imagen, y de paso
  // fijamos la extensión nosotros mismos desde una lista cerrada,
  // nunca a partir de lo que mandó el cliente.
  function tipoRealDeImagen(buf) {
    if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { mime: "image/png", ext: "png" };
    }
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return { mime: "image/jpeg", ext: "jpg" };
    }
    if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
      return { mime: "image/webp", ext: "webp" };
    }
    if (buf.length >= 6 && (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a")) {
      return { mime: "image/gif", ext: "gif" };
    }
    return null;
  }

  const real = tipoRealDeImagen(buffer);
  if (!real) {
    return NextResponse.json({ error: "El archivo no es una imagen válida (solo JPG, PNG, WEBP o GIF)." }, { status: 400 });
  }

  const nombre = `${randomUUID()}.${real.ext}`;

  const db = supabaseServer();
  const { error } = await db.storage.from(bucket).upload(nombre, buffer, {
    contentType: real.mime,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path: `${bucket}/${nombre}` });
}
