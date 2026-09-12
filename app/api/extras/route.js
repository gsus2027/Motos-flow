import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { EXTRAS_COBERTURAS_POR_DEFECTO } from "@/lib/pricing";
import { limitadorEscritura, ipDelRequest, verificarLimite } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CLAVE = "extras_coberturas";

// GET: pública — el formulario del cliente necesita ver los precios de
// los extras y de la cobertura premium para mostrarlos y calcular el total.
export async function GET() {
  const db = supabaseServer();
  const { data, error } = await db.from("configuracion").select("valor").eq("clave", CLAVE).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json(EXTRAS_COBERTURAS_POR_DEFECTO);
  try {
    return NextResponse.json(JSON.parse(data.valor));
  } catch {
    return NextResponse.json(EXTRAS_COBERTURAS_POR_DEFECTO);
  }
}

// PATCH: solo administradores — guarda los nuevos precios/nombres.
export async function PATCH(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sesion = await tokenValido(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const db = supabaseServer();
  const { data: staffActual } = await db.from("staff").select("es_admin").eq("id", sesion.staffId).maybeSingle();
  if (!staffActual?.es_admin) {
    return NextResponse.json({ error: "Solo un administrador puede cambiar esto." }, { status: 401 });
  }
  const { exito } = await verificarLimite(limitadorEscritura, ipDelRequest(req));
  if (!exito) {
    return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  const body = await req.json();
  const coberturaPremium = Number(body.coberturaPremium);
  if (!Number.isFinite(coberturaPremium) || coberturaPremium < 0) {
    return NextResponse.json({ error: "Precio de cobertura inválido." }, { status: 400 });
  }
  if (!Array.isArray(body.extras) || body.extras.length === 0) {
    return NextResponse.json({ error: "La lista de extras no puede estar vacía." }, { status: 400 });
  }
  for (const e of body.extras) {
    if (!e.id || !e.nombre || !Number.isFinite(Number(e.precioMoto)) || !Number.isFinite(Number(e.precioEbike))) {
      return NextResponse.json({ error: "Cada extra necesita nombre y ambos precios." }, { status: 400 });
    }
  }

  const nuevo = {
    coberturaPremium,
    extras: body.extras.map((e) => ({
      id: String(e.id),
      nombre: String(e.nombre).slice(0, 80),
      precioMoto: Number(e.precioMoto),
      precioEbike: Number(e.precioEbike),
      notaMoto: e.notaMoto ? String(e.notaMoto).slice(0, 80) : undefined,
      notaEbike: e.notaEbike ? String(e.notaEbike).slice(0, 80) : undefined,
    })),
  };

  const { error } = await db.from("configuracion").upsert({ clave: CLAVE, valor: JSON.stringify(nuevo) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(nuevo);
}
