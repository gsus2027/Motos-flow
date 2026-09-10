import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";

async function requiereAdmin(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sesion = await tokenValido(token);
  if (!sesion) return false;
  const db = supabaseServer();
  const { data } = await db.from("staff").select("es_admin").eq("id", sesion.staffId).maybeSingle();
  return Boolean(data?.es_admin);
}

// GET: solo administradores — lista los respaldos disponibles, o (con
// ?descargar=archivo) genera un link temporal de 5 minutos para descargar uno.
export async function GET(req) {
  if (!(await requiereAdmin(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const db = supabaseServer();
  const descargar = new URL(req.url).searchParams.get("descargar");

  if (descargar) {
    const { data, error } = await db.storage.from("respaldos").createSignedUrl(descargar, 300);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ url: data.signedUrl });
  }

  const { data, error } = await db.storage.from("respaldos").list("", {
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const archivos = (data || [])
    .filter((f) => f.name.endsWith(".json"))
    .map((f) => ({ nombre: f.name, creado: f.created_at, tamano: f.metadata?.size || 0 }));

  return NextResponse.json({ archivos });
}
