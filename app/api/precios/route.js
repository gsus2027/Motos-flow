import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { TARIFAS_POR_DEFECTO, TARIFA_EBIKE_DIA_POR_DEFECTO } from "@/lib/pricing";
import { limitadorEscritura, ipDelRequest, verificarLimite } from "@/lib/ratelimit";

// Sin esto, Next.js puede guardar en caché la respuesta de este GET (al no
// leer cookies ni parámetros de la URL, la trata como si fuera contenido
// fijo) — y entonces, después de cambiar un precio en el Panel, algunos
// clientes seguirían viendo el precio viejo hasta que la caché expirara
// por su cuenta. Esto obliga a consultar la base de datos siempre.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CLAVE = "tarifas";

function tarifasPorDefecto() {
  return {
    navi: { ...TARIFAS_POR_DEFECTO.navi },
    scooter: { ...TARIFAS_POR_DEFECTO.scooter },
    ebikeDia: TARIFA_EBIKE_DIA_POR_DEFECTO,
  };
}

// Valida que cada valor sea un número positivo razonable (evita que un
// error de tipeo, o un valor malicioso, dañe el cálculo de precios.
function tarifasValidas(t) {
  if (!t || typeof t !== "object") return false;
  const numeros = [
    t?.navi?.dia, t?.navi?.especial, t?.navi?.nocturno,
    t?.scooter?.dia, t?.scooter?.especial, t?.scooter?.nocturno,
    t?.ebikeDia,
  ];
  return numeros.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1000);
}

// GET: pública — el formulario del cliente necesita las tarifas vigentes
// para calcular el precio en tiempo real, antes de tener ninguna sesión.
export async function GET() {
  const db = supabaseServer();
  const { data } = await db.from("configuracion").select("valor").eq("clave", CLAVE).maybeSingle();
  if (!data?.valor) {
    return NextResponse.json({ tarifas: tarifasPorDefecto() });
  }
  try {
    const tarifas = JSON.parse(data.valor);
    if (!tarifasValidas(tarifas)) throw new Error("inválido");
    return NextResponse.json({ tarifas });
  } catch {
    return NextResponse.json({ tarifas: tarifasPorDefecto() });
  }
}

// PATCH: solo administradores — guarda las tarifas nuevas.
export async function PATCH(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sesion = await tokenValido(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const db0 = supabaseServer();
  const { data: staffActual } = await db0.from("staff").select("es_admin").eq("id", sesion.staffId).maybeSingle();
  if (!staffActual?.es_admin) {
    return NextResponse.json({ error: "Solo un administrador puede cambiar los precios." }, { status: 401 });
  }
  const { exito } = await verificarLimite(limitadorEscritura, ipDelRequest(req));
  if (!exito) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." }, { status: 429 });
  }

  const body = await req.json();
  const tarifas = {
    navi: {
      dia: Number(body?.navi?.dia),
      especial: Number(body?.navi?.especial),
      nocturno: Number(body?.navi?.nocturno),
    },
    scooter: {
      dia: Number(body?.scooter?.dia),
      especial: Number(body?.scooter?.especial),
      nocturno: Number(body?.scooter?.nocturno),
    },
    ebikeDia: Number(body?.ebikeDia),
  };

  if (!tarifasValidas(tarifas)) {
    return NextResponse.json({ error: "Los valores deben ser números entre 0 y 1000." }, { status: 400 });
  }

  const db = supabaseServer();
  const { error } = await db
    .from("configuracion")
    .upsert({ clave: CLAVE, valor: JSON.stringify(tarifas) }, { onConflict: "clave" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tarifas });
}
