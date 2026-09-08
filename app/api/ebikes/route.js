import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";

function requiereStaff(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return tokenValido(token);
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
  if (!requiereStaff(req)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
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
  if (!requiereStaff(req)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
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
