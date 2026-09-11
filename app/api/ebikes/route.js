import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { limitadorEscritura, ipDelRequest, verificarLimite } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

function requiereStaff(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return tokenValido(token);
}

// Gestionar la flota (agregar, quitar) queda reservado solo para el
// administrador — el resto del staff ni ve estas pantallas ni puede
// llamar estas rutas directamente.
async function requiereAdmin(req) {
  const sesion = await requiereStaff(req);
  if (!sesion) return false;
  const db = supabaseServer();
  const { data } = await db.from("staff").select("es_admin").eq("id", sesion.staffId).maybeSingle();
  return Boolean(data?.es_admin);
}

// GET: pública — el formulario del cliente necesita ver qué ebikes hay
export async function GET(req) {
  const db = supabaseServer();
  const { data, error } = await db
    .from("ebikes")
    .select("id, numero, creado_en")
    .order("creado_en", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const soloDisponibles = new URL(req.url).searchParams.get("disponibles") === "1";
  if (!soloDisponibles) return NextResponse.json({ ebikes: data });

  const { data: activas } = await db.from("rentas_ebike").select("ebike_id").eq("estado", "activa");
  const ocupadas = new Set((activas || []).map((r) => r.ebike_id));
  return NextResponse.json({ ebikes: data.filter((e) => !ocupadas.has(e.id)) });
}

// POST: solo staff — agregar una ebike nueva
export async function POST(req) {
  if (!(await requiereAdmin(req))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { exito } = await verificarLimite(limitadorEscritura, ipDelRequest(req));
  if (!exito) return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  const { numero } = await req.json();
  if (!numero?.trim()) {
    return NextResponse.json({ error: "Indica el número de la ebike." }, { status: 400 });
  }
  const db = supabaseServer();
  const { data, error } = await db.from("ebikes").insert({ numero: numero.trim() }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ebike: data });
}

// DELETE: solo staff — eliminar una ebike (falla si tiene rentas activas)
export async function DELETE(req) {
  if (!(await requiereAdmin(req))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { exito } = await verificarLimite(limitadorEscritura, ipDelRequest(req));
  if (!exito) return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta el id de la ebike." }, { status: 400 });

  const db = supabaseServer();
  const { data: ocupada } = await db
    .from("rentas_ebike")
    .select("id")
    .eq("ebike_id", id)
    .eq("estado", "activa")
    .maybeSingle();
  if (ocupada) {
    return NextResponse.json({ error: "No se puede eliminar: esta ebike tiene una renta activa." }, { status: 409 });
  }

  const { error } = await db.from("ebikes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
