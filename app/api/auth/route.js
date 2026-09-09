import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { crearToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { limitadorAuth, ipDelRequest, verificarLimite } from "@/lib/ratelimit";

// GET: indica si ya existe un código de acceso configurado
export async function GET() {
  const db = supabaseServer();
  const { data } = await db.from("configuracion").select("valor").eq("clave", "admin_pin").maybeSingle();
  return NextResponse.json({ configurado: Boolean(data?.valor) });
}

// POST: crea el código (si no existe) o valida el código enviado
export async function POST(req) {
  const { exito } = await verificarLimite(limitadorAuth, ipDelRequest(req));
  if (!exito) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  const { pin } = await req.json();
  if (!pin || String(pin).trim().length < 4) {
    return NextResponse.json({ error: "El código debe tener al menos 4 caracteres." }, { status: 400 });
  }

  const db = supabaseServer();
  const { data } = await db.from("configuracion").select("valor").eq("clave", "admin_pin").maybeSingle();

  if (!data?.valor) {
    // Primera vez: se guarda como el código oficial del equipo
    await db.from("configuracion").upsert({ clave: "admin_pin", valor: String(pin).trim() });
  } else if (data.valor !== String(pin).trim()) {
    return NextResponse.json({ error: "Código incorrecto." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, await crearToken(), {
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
