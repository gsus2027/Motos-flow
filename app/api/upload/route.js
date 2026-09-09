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
  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  // Límite de tamaño razonable (5 MB) para evitar abuso
  if (buffer.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "La imagen es demasiado grande." }, { status: 413 });
  }

  const ext = mime.split("/")[1] || "jpg";
  const nombre = `${randomUUID()}.${ext}`;

  const db = supabaseServer();
  const { error } = await db.storage.from(bucket).upload(nombre, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path: `${bucket}/${nombre}` });
}
