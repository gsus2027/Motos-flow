import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";

const TABLAS = ["motos", "rentas", "ebikes", "rentas_ebike", "configuracion"];

// Autoriza la solicitud de DOS formas posibles:
// 1) Vercel Cron, que manda el CRON_SECRET automáticamente cada día.
// 2) Un miembro del staff, con sesión válida, pidiendo un respaldo manual
//    desde el panel ("Generar respaldo ahora").
async function autorizado(req) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sesion = await tokenValido(token);
  if (!sesion) return false;
  const db = supabaseServer();
  const { data } = await db.from("staff").select("es_admin").eq("id", sesion.staffId).maybeSingle();
  return Boolean(data?.es_admin);
}

export async function GET(req) {
  if (!(await autorizado(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const db = supabaseServer();
  const respaldo = { generado_en: new Date().toISOString(), tablas: {} };

  for (const tabla of TABLAS) {
    const { data, error } = await db.from(tabla).select("*");
    if (error) {
      return NextResponse.json({ error: `Fallo al leer "${tabla}": ${error.message}` }, { status: 500 });
    }
    respaldo.tablas[tabla] = data;
  }

  const nombre = `respaldo-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`;
  const { error: errorSubida } = await db.storage
    .from("respaldos")
    .upload(nombre, Buffer.from(JSON.stringify(respaldo, null, 2)), {
      contentType: "application/json",
      upsert: false,
    });
  if (errorSubida) {
    return NextResponse.json({ error: errorSubida.message }, { status: 500 });
  }

  // Solo se conservan los últimos 5 meses (150 respaldos) — suficiente
  // para cubrir el plazo típico de un banco para reclamos de tarjeta
  // (usualmente hasta 3 meses desde el cobro), con margen de sobra.
  const { data: existentes } = await db.storage.from("respaldos").list("", {
    sortBy: { column: "created_at", order: "desc" },
  });
  const sobrantes = (existentes || []).filter((f) => f.name.endsWith(".json")).slice(150);
  if (sobrantes.length > 0) {
    await db.storage.from("respaldos").remove(sobrantes.map((f) => f.name));
  }

  return NextResponse.json({ ok: true, archivo: nombre });
}
