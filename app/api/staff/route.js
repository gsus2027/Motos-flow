import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME, generarSalt, hashPin } from "@/lib/session";
import { limitadorEscritura, ipDelRequest, verificarLimite } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

async function requiereStaff(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return tokenValido(token);
}

// Gestionar al equipo (agregar, desactivar, cambiar PIN, dar/quitar el
// rol de administrador) queda reservado solo para quien ya es administrador.
async function requiereAdmin(req) {
  const sesion = await requiereStaff(req);
  if (!sesion) return false;
  const db = supabaseServer();
  const { data } = await db.from("staff").select("es_admin").eq("id", sesion.staffId).maybeSingle();
  return Boolean(data?.es_admin);
}

// GET: solo administradores — lista a todo el equipo (sin exponer los PINs)
export async function GET(req) {
  if (!(await requiereAdmin(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const db = supabaseServer();
  const { data, error } = await db.from("staff").select("id, nombre, activo, es_admin, creado_en").order("creado_en");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data });
}

// POST: solo staff — agrega un nuevo miembro del equipo
export async function POST(req) {
  if (!(await requiereAdmin(req))) {
    return NextResponse.json({ error: "Solo un administrador puede agregar gente al equipo." }, { status: 401 });
  }
  const { exito } = await verificarLimite(limitadorEscritura, ipDelRequest(req));
  if (!exito) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." }, { status: 429 });
  }

  const { nombre, pin } = await req.json();
  const nombreLimpio = String(nombre || "").trim();
  const pinLimpio = String(pin || "").trim();
  if (!nombreLimpio) return NextResponse.json({ error: "Escribe el nombre de la persona." }, { status: 400 });
  if (pinLimpio.length < 6) return NextResponse.json({ error: "El PIN debe tener al menos 6 caracteres." }, { status: 400 });

  const salt = generarSalt();
  const pinHash = await hashPin(pinLimpio, salt);
  const db = supabaseServer();
  const { data, error } = await db
    .from("staff")
    .insert({ nombre: nombreLimpio, pin_hash: pinHash, pin_salt: salt })
    .select("id, nombre, activo, es_admin, creado_en")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data });
}

// PATCH: solo administradores — activa/desactiva, cambia PIN, o da/quita
// el rol de administrador a alguien del equipo.
export async function PATCH(req) {
  if (!(await requiereAdmin(req))) {
    return NextResponse.json({ error: "Solo un administrador puede hacer cambios en el equipo." }, { status: 401 });
  }
  const { exito } = await verificarLimite(limitadorEscritura, ipDelRequest(req));
  if (!exito) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." }, { status: 429 });
  }

  const { id, activo, pin, esAdmin } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta el id." }, { status: 400 });

  const db = supabaseServer();

  // No dejar que el equipo se quede sin nadie activo (evita el bloqueo total)
  if (activo === false) {
    const { count } = await db.from("staff").select("id", { count: "exact", head: true }).eq("activo", true);
    if ((count || 0) <= 1) {
      return NextResponse.json({ error: "No puedes desactivar a la última persona activa del equipo." }, { status: 400 });
    }
  }
  // Tampoco dejar al equipo sin ningún administrador
  if (esAdmin === false) {
    const { count } = await db.from("staff").select("id", { count: "exact", head: true }).eq("es_admin", true);
    if ((count || 0) <= 1) {
      return NextResponse.json({ error: "No puedes quitarle el rol de administrador al último que lo tiene." }, { status: 400 });
    }
  }

  const cambios = {};
  if (typeof activo === "boolean") cambios.activo = activo;
  if (typeof esAdmin === "boolean") cambios.es_admin = esAdmin;
  if (pin) {
    const pinLimpio = String(pin).trim();
    if (pinLimpio.length < 6) return NextResponse.json({ error: "El PIN debe tener al menos 6 caracteres." }, { status: 400 });
    cambios.pin_salt = generarSalt();
    cambios.pin_hash = await hashPin(pinLimpio, cambios.pin_salt);
  }
  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: "No hay ningún cambio que guardar." }, { status: 400 });
  }

  const { error } = await db.from("staff").update(cambios).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
