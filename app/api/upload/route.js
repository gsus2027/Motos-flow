import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { randomUUID } from "crypto";

// POST: pública — recibe una imagen en base64 (dataURL) y la sube al
// bucket correspondiente ("carnets" o "firmas"), devolviendo la URL pública.
// Es pública porque el cliente necesita poder subir su foto/firma antes
// de tener ninguna sesión — pero solo permite escribir imágenes pequeñas
// a dos buckets fijos, nunca leer ni tocar el resto de la base de datos.
export async function POST(req) {
  const { dataUrl, tipo } = await req.json();
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Imagen inválida." }, { status: 400 });
  }
  const bucket = tipo === "firma" ? "firmas" : "carnets";

  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return NextResponse.json({ error: "Formato de imagen inválido." }, { status: 400 });
  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  // Límite de tamaño razonable (5 MB) para evitar abuso del bucket público
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

  const { data: pub } = db.storage.from(bucket).getPublicUrl(nombre);
  return NextResponse.json({ url: pub.publicUrl });
}
