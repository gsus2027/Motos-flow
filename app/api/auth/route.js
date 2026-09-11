import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  crearToken, tokenValido, SESSION_COOKIE_NAME,
  generarSalt, hashPin, pinCoincide,
} from "@/lib/session";
import { limitadorAuth, ipDelRequest, verificarLimite } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET: indica si ya existe al menos un miembro del staff configurado
// (para saber si mostrar "crear el primer usuario" o "elegir e iniciar
// sesión"), y quién es el usuario actual si ya hay una sesión válida.
export async function GET(req) {
  const db = supabaseServer();
  const { data: activos } = await db.from("staff").select("id, nombre").eq("activo", true).order("nombre");

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sesion = await tokenValido(token);
  let staffActual = null;
  if (sesion) {
    const { data } = await db.from("staff").select("id, nombre, es_admin").eq("id", sesion.staffId).maybeSingle();
    staffActual = data || null;
  }

  return NextResponse.json({ staff: activos || [], staffActual });
}

// POST: dos modos —
// 1) { crear: true, nombre, pin } → SOLO si todavía no existe ningún
//    miembro del staff (primera vez configurando el panel).
// 2) { staffId, pin } → inicio de sesión normal de un miembro existente.
export async function POST(req) {
  const { exito } = await verificarLimite(limitadorAuth, ipDelRequest(req));
  if (!exito) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const db = supabaseServer();

  if (body?.crear) {
    const { count } = await db.from("staff").select("id", { count: "exact", head: true });
    if (count && count > 0) {
      return NextResponse.json({ error: "Ya existe el equipo. Pide que alguien te agregue desde el panel." }, { status: 409 });
    }
    const nombre = String(body.nombre || "").trim();
    const pin = String(body.pin || "").trim();
    if (!nombre) return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
    if (pin.length < 6) return NextResponse.json({ error: "El PIN debe tener al menos 6 caracteres." }, { status: 400 });

    const salt = generarSalt();
    const pinHash = await hashPin(pin, salt);
    const { data: nuevo, error } = await db
      .from("staff")
      .insert({ nombre, pin_hash: pinHash, pin_salt: salt, es_admin: true })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return conSesion(nuevo.id);
  }

  const staffId = body?.staffId;
  const pin = String(body?.pin || "").trim();
  if (!staffId || !pin) {
    return NextResponse.json({ error: "Selecciona tu nombre y escribe tu PIN." }, { status: 400 });
  }

  const { data: staff } = await db.from("staff").select("*").eq("id", staffId).eq("activo", true).maybeSingle();
  if (!staff || !(await pinCoincide(pin, staff.pin_salt, staff.pin_hash))) {
    return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
  }

  return conSesion(staff.id);
}

async function conSesion(staffId) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, await crearToken(staffId), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return res;
}

// DELETE: cierra la sesión del panel (bloquear panel)
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
