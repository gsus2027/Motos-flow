import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { limitadorEscritura, ipDelRequest, verificarLimite } from "@/lib/ratelimit";
import { filtrarDisponibles, rangoDePedido } from "@/lib/disponibilidad";

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

// GET: pública (el formulario del cliente necesita ver qué motos hay
// disponibles), solo devuelve id/placa/modelo/tipo, nada sensible.
export async function GET(req) {
  const db = supabaseServer();
  const { data, error } = await db
    .from("motos")
    .select("id, placa, modelo, tipo, creado_en")
    .order("creado_en", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const soloDisponibles = new URL(req.url).searchParams.get("disponibles") === "1";
  if (!soloDisponibles) return NextResponse.json({ motos: data });

  // Disponibles en las fechas pedidas (?desde=YYYY-MM-DD&hasta=YYYY-MM-DD,
  // por defecto hoy). Una reserva futura no bloquea la moto antes de su
  // fecha: solo se avisa con "reservadaDesde".
  const { desde, hasta, hoy } = rangoDePedido(req);
  const { data: activas, error: e2 } = await db.from("rentas").select("id, moto_id, estado, fecha_entrega, fecha_prevista").eq("estado", "activa");
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  return NextResponse.json({ motos: filtrarDisponibles({ vehiculos: data, rentas: activas, campo: "moto_id", desde, hasta, hoy }) });
}

// POST: solo staff — agregar una moto nueva
export async function POST(req) {
  if (!(await requiereAdmin(req))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { exito } = await verificarLimite(limitadorEscritura, ipDelRequest(req));
  if (!exito) return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  const { placa, modelo, tipo } = await req.json();
  if (!placa?.trim() || !modelo?.trim()) {
    return NextResponse.json({ error: "Indica la placa y el modelo de la moto." }, { status: 400 });
  }
  const db = supabaseServer();
  const { data, error } = await db
    .from("motos")
    .insert({ placa: placa.trim().toUpperCase(), modelo: modelo.trim(), tipo: tipo === "scooter" ? "scooter" : "navi" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ moto: data });
}

// DELETE: solo staff — eliminar una moto (falla si tiene rentas activas)
export async function DELETE(req) {
  if (!(await requiereAdmin(req))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { exito } = await verificarLimite(limitadorEscritura, ipDelRequest(req));
  if (!exito) return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta el id de la moto." }, { status: 400 });

  const db = supabaseServer();
  const { data: ocupada } = await db
    .from("rentas")
    .select("id")
    .eq("moto_id", id)
    .eq("estado", "activa")
    .maybeSingle();
  if (ocupada) {
    return NextResponse.json({ error: "No se puede eliminar: esta moto tiene una renta activa." }, { status: 409 });
  }

  const { error } = await db.from("motos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
