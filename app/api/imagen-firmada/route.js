import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";

// GET: solo staff — genera un link temporal (expira en 5 minutos) para ver
// una foto de carnet o una firma que están guardadas de forma privada.
// Sin este paso (y sin haber entrado con el código del panel), nadie puede
// ver estas imágenes, ni siquiera con el link directo.
export async function GET(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await tokenValido(token))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const path = new URL(req.url).searchParams.get("path");
  if (!path || !path.includes("/")) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
  }

  const [bucket, ...resto] = path.split("/");
  const archivo = resto.join("/");
  if (!["carnets", "firmas"].includes(bucket)) {
    return NextResponse.json({ error: "Bucket inválido." }, { status: 400 });
  }

  const db = supabaseServer();
  const { data, error } = await db.storage.from(bucket).createSignedUrl(archivo, 300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
