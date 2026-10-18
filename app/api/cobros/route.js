import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { fechaHoyPanama } from "@/lib/pricing";
import {
  METODOS_COBRO,
  validarAutorizacion,
  metodoPideAutorizacion,
  normalizarAutorizacion,
  r2,
  inicioDiaPanama,
  finDiaPanama,
} from "@/lib/cobros";

export const dynamic = "force-dynamic";

// Cobros de rentas (cuadre de pagos, 13-oct-2026). Ver supabase-schema-cobros.sql.

const TABLA_POR_TIPO = { moto: "rentas", ebike: "rentas_ebike" };
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

async function sesionStaff(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return tokenValido(token);
}

async function staffDeSesion(db, sesion) {
  const { data } = await db.from("staff").select("id, nombre, es_admin").eq("id", sesion.staffId).maybeSingle();
  return data || null;
}

// Agrega a cada cobro los datos de su renta (cliente y vehículo), para el
// Cierre del día. Las dos tablas de rentas se consultan aparte.
async function conDatosDeRenta(db, cobros) {
  const idsPorTipo = { moto: [], ebike: [] };
  for (const c of cobros) idsPorTipo[c.renta_tipo]?.push(c.renta_id);
  const [motos, ebikes] = await Promise.all([
    idsPorTipo.moto.length
      ? db.from("rentas").select("id, cliente, atendido_por, motos(placa, modelo)").in("id", [...new Set(idsPorTipo.moto)])
      : { data: [] },
    idsPorTipo.ebike.length
      ? db.from("rentas_ebike").select("id, cliente, atendido_por, ebikes(numero)").in("id", [...new Set(idsPorTipo.ebike)])
      : { data: [] },
  ]);
  const porId = {};
  for (const r of motos.data || []) {
    porId[`moto:${r.id}`] = { cliente: r.cliente, atendidoPor: r.atendido_por, vehiculo: r.motos ? `${r.motos.placa} — ${r.motos.modelo}` : "Moto" };
  }
  for (const r of ebikes.data || []) {
    porId[`ebike:${r.id}`] = { cliente: r.cliente, atendidoPor: r.atendido_por, vehiculo: r.ebikes ? `Ebike ${r.ebikes.numero}` : "Ebike" };
  }
  return cobros.map((c) => ({ ...c, renta: porId[`${c.renta_tipo}:${c.renta_id}`] || null }));
}

// GET — solo staff.
//   ?fecha=YYYY-MM-DD (o ?desde=&hasta=) → cobros de ese día/rango, con datos de la renta (Cierre del día).
//   sin parámetros → cobros de todas las rentas que siguen activas (Panel: cuánto falta por cobrar).
export async function GET(req) {
  if (!(await sesionStaff(req))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = supabaseServer();
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const desde = searchParams.get("desde") || fecha;
  const hasta = searchParams.get("hasta") || fecha;

  if (desde || hasta) {
    if (!FECHA_ISO.test(desde || "") || !FECHA_ISO.test(hasta || "")) {
      return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
    }
    const { data, error } = await db
      .from("cobros")
      .select("*")
      .gte("creado_en", inicioDiaPanama(desde))
      .lte("creado_en", finDiaPanama(hasta))
      .order("creado_en", { ascending: true })
      .limit(2000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ cobros: await conDatosDeRenta(db, data || []) });
  }

  const [motos, ebikes] = await Promise.all([
    db.from("rentas").select("id").eq("estado", "activa"),
    db.from("rentas_ebike").select("id").eq("estado", "activa"),
  ]);
  const ids = [...(motos.data || []), ...(ebikes.data || [])].map((r) => r.id);
  if (ids.length === 0) return NextResponse.json({ cobros: [] });
  const { data, error } = await db.from("cobros").select("*").in("renta_id", ids).order("creado_en", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cobros: data || [] });
}

// POST — solo staff: registra un cobro de una renta.
// Body: { rentaTipo: 'moto'|'ebike', rentaId, monto, metodo, autorizacion }
export async function POST(req) {
  const sesion = await sesionStaff(req);
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = supabaseServer();
  const staff = await staffDeSesion(db, sesion);
  if (!staff) return NextResponse.json({ error: "Tu sesión ya no es válida. Vuelve a entrar." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { rentaTipo, rentaId, metodo, autorizacion } = body;
  const monto = r2(body.monto);
  const tabla = TABLA_POR_TIPO[rentaTipo];

  // 18-oct-2026: cobrar varias rentas de un mismo contrato en un solo pago
  // (mismo método y misma autorización). El monto se reparte en orden, a
  // cada renta lo que le falta. Body: { rentas: [{ rentaTipo, rentaId }], monto, metodo, autorizacion }.
  if (Array.isArray(body.rentas) && body.rentas.length > 0) {
    if (!METODOS_COBRO.includes(metodo)) return NextResponse.json({ error: "Elige cómo pagó: efectivo, tarjeta o Yappy." }, { status: 400 });
    if (!(monto > 0)) return NextResponse.json({ error: "Escribe el monto que recibiste." }, { status: 400 });
    const autG = validarAutorizacion(metodo, autorizacion);
    if (autG.error) return NextResponse.json({ error: autG.error }, { status: 400 });
    const pendientes = [];
    for (const it of body.rentas.slice(0, 10)) {
      const t = TABLA_POR_TIPO[it?.rentaTipo];
      if (!t || !it.rentaId) return NextResponse.json({ error: "Falta indicar la renta." }, { status: 400 });
      const { data: r } = await db.from(t).select("id, tarifa_total").eq("id", it.rentaId).maybeSingle();
      if (!r) return NextResponse.json({ error: "Una de las rentas no existe." }, { status: 404 });
      const { data: prev } = await db.from("cobros").select("monto").eq("renta_tipo", it.rentaTipo).eq("renta_id", it.rentaId);
      const pag = r2((prev || []).reduce((s2, c) => s2 + Number(c.monto || 0), 0));
      pendientes.push({ rentaTipo: it.rentaTipo, rentaId: it.rentaId, falta: r2(Math.max(0, Number(r.tarifa_total || 0) - pag)) });
    }
    const totalFalta = r2(pendientes.reduce((s2, p) => s2 + p.falta, 0));
    if (monto > totalFalta + 0.001) {
      return NextResponse.json(
        { error: totalFalta > 0 ? `A este contrato solo le faltan $${totalFalta.toFixed(2)}. Revisa el monto.` : "Este contrato ya está pagado completo." },
        { status: 409 }
      );
    }
    let resto = monto;
    const filas = [];
    for (const p of pendientes) {
      const parte = r2(Math.min(p.falta, resto));
      if (parte <= 0) continue;
      resto = r2(resto - parte);
      filas.push({
        renta_tipo: p.rentaTipo,
        renta_id: p.rentaId,
        monto: parte,
        metodo,
        autorizacion_ult4: autG.ult4,
        cobrado_por_id: staff.id,
        cobrado_por_nombre: staff.nombre,
      });
    }
    const { data: creados, error: errG } = await db.from("cobros").insert(filas).select();
    if (errG) return NextResponse.json({ error: errG.message }, { status: 500 });
    return NextResponse.json({ cobro: creados?.[0] || null, cobros: creados || [] });
  }

  if (!tabla || !rentaId) return NextResponse.json({ error: "Falta indicar la renta." }, { status: 400 });
  if (!METODOS_COBRO.includes(metodo)) return NextResponse.json({ error: "Elige cómo pagó: efectivo, tarjeta o Yappy." }, { status: 400 });
  if (!(monto > 0)) return NextResponse.json({ error: "Escribe el monto que recibiste." }, { status: 400 });
  const aut = validarAutorizacion(metodo, autorizacion);
  if (aut.error) return NextResponse.json({ error: aut.error }, { status: 400 });

  const { data: renta } = await db.from(tabla).select("id, tarifa_total").eq("id", rentaId).maybeSingle();
  if (!renta) return NextResponse.json({ error: "Esa renta no existe." }, { status: 404 });

  // No se deja cobrar más de lo que falta: casi siempre es un error de
  // dedo o un cobro repetido (dos personas cobrando la misma renta).
  const { data: previos } = await db.from("cobros").select("monto").eq("renta_tipo", rentaTipo).eq("renta_id", rentaId);
  const pagado = r2((previos || []).reduce((s, c) => s + Number(c.monto || 0), 0));
  const pendiente = r2(Math.max(0, Number(renta.tarifa_total || 0) - pagado));
  if (monto > pendiente + 0.001) {
    return NextResponse.json(
      {
        error:
          pendiente > 0
            ? `A esta renta solo le faltan $${pendiente.toFixed(2)}. Revisa el monto.`
            : "Esta renta ya está pagada completa.",
      },
      { status: 409 }
    );
  }

  const { data, error } = await db
    .from("cobros")
    .insert({
      renta_tipo: rentaTipo,
      renta_id: rentaId,
      monto,
      metodo,
      autorizacion_ult4: aut.ult4,
      cobrado_por_id: staff.id,
      cobrado_por_nombre: staff.nombre,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cobro: data });
}

// PATCH — solo staff: corrige el método de un cobro (ej. lo marcaron
// Tarjeta y fue Efectivo). Queda anotado quién lo corrigió y cuándo.
// Body: { id, metodo, autorizacion }
export async function PATCH(req) {
  const sesion = await sesionStaff(req);
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = supabaseServer();
  const staff = await staffDeSesion(db, sesion);
  if (!staff) return NextResponse.json({ error: "Tu sesión ya no es válida. Vuelve a entrar." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id, metodo, autorizacion } = body;
  if (!id) return NextResponse.json({ error: "Falta el cobro." }, { status: 400 });
  if (!METODOS_COBRO.includes(metodo)) return NextResponse.json({ error: "Método inválido." }, { status: 400 });

  const { data: actual } = await db.from("cobros").select("id, metodo, autorizacion_ult4, creado_en").eq("id", id).maybeSingle();
  if (!actual) return NextResponse.json({ error: "Ese cobro no existe." }, { status: 404 });

  // Solo un administrador corrige cobros de días anteriores; el día mismo,
  // cualquiera del equipo (es cuando se cuadra la caja).
  const diaCobro = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Panama" }).format(new Date(actual.creado_en));
  if (diaCobro !== fechaHoyPanama() && !staff.es_admin) {
    return NextResponse.json({ error: "Solo un administrador puede corregir cobros de otro día." }, { status: 403 });
  }

  let autorizacionUlt4 = null;
  if (metodoPideAutorizacion(metodo)) {
    const nueva = normalizarAutorizacion(autorizacion);
    if (nueva) autorizacionUlt4 = nueva;
    else if (metodo === actual.metodo && actual.autorizacion_ult4) autorizacionUlt4 = actual.autorizacion_ult4;
    else {
      const aut = validarAutorizacion(metodo, autorizacion);
      return NextResponse.json({ error: aut.error }, { status: 400 });
    }
  }

  const { data, error } = await db
    .from("cobros")
    .update({
      metodo,
      autorizacion_ult4: autorizacionUlt4,
      corregido_por_nombre: staff.nombre,
      corregido_en: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cobro: data });
}
