import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { fechaHoyPanama } from "@/lib/pricing";
import { calcularComisiones, aplicarPagos, normalizarConfig, primerDiaDelMes } from "@/lib/comisiones";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CLAVE = "comisiones";
const FORMAS = ["efectivo", "yappy", "transferencia", "otro"];
const TAM_PAGINA = 1000; // Supabase devuelve como máximo 1000 filas por consulta

const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;

async function sesionYStaff(req, db) {
  const sesion = await tokenValido(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!sesion) return null;
  const { data } = await db.from("staff").select("id, nombre, es_admin, comisiona").eq("id", sesion.staffId).maybeSingle();
  return data || null;
}

// Trae todas las filas de una consulta, de 1000 en 1000, para que el
// cálculo no se corte cuando haya muchas rentas.
async function todas(consulta) {
  const filas = [];
  for (let desde = 0; ; desde += TAM_PAGINA) {
    const { data, error } = await consulta().range(desde, desde + TAM_PAGINA - 1);
    if (error) throw new Error(error.message);
    filas.push(...(data || []));
    if (!data || data.length < TAM_PAGINA) return filas;
  }
}

// Lee la configuración. La primera vez fija el inicio del sistema de
// comisiones en el primer día del mes actual, para que las rentas viejas
// no entren de golpe.
async function leerConfig(db, hoy) {
  const { data } = await db.from("configuracion").select("valor").eq("clave", CLAVE).maybeSingle();
  let guardada = {};
  try {
    guardada = data?.valor ? JSON.parse(data.valor) : {};
  } catch {
    guardada = {};
  }
  const cfg = normalizarConfig(guardada);
  if (!cfg.inicio) {
    cfg.inicio = primerDiaDelMes(hoy);
    await db.from("configuracion").upsert({ clave: CLAVE, valor: JSON.stringify(cfg) }, { onConflict: "clave" });
  }
  return cfg;
}

// Rentas desde el inicio del sistema hasta hoy (motos + ebikes). Las que
// se pagaron con el sistema anterior de "cerrar periodo" quedan fuera.
async function rentasConComision(db, desde, hasta, staff) {
  const idPorNombre = new Map();
  for (const s of staff) idPorNombre.set(s.nombre, idPorNombre.has(s.nombre) ? null : s.id);

  const [motos, ebikes] = await Promise.all([
    todas(() =>
      db.from("rentas")
        .select("id, fecha_entrega, tarifa_total, atendido_por_id, atendido_por, cliente, motos(placa, modelo)")
        .is("comision_periodo_id", null)
        .gte("fecha_entrega", desde)
        .lte("fecha_entrega", hasta)
        .order("id")
    ),
    todas(() =>
      db.from("rentas_ebike")
        .select("id, fecha_entrega, tarifa_total, atendido_por_id, atendido_por, cliente, ebikes(numero)")
        .is("comision_periodo_id", null)
        .gte("fecha_entrega", desde)
        .lte("fecha_entrega", hasta)
        .order("id")
    ),
  ]);

  const quien = (r) => r.atendido_por_id || idPorNombre.get(r.atendido_por) || null;
  return [
    ...motos.map((r) => ({
      id: r.id, tipo: "moto", fecha_entrega: r.fecha_entrega, tarifa_total: r.tarifa_total,
      atendido_por_id: quien(r), cliente: r.cliente,
      vehiculo: r.motos ? `${r.motos.placa} — ${r.motos.modelo}` : "Moto",
    })),
    ...ebikes.map((r) => ({
      id: r.id, tipo: "ebike", fecha_entrega: r.fecha_entrega, tarifa_total: r.tarifa_total,
      atendido_por_id: quien(r), cliente: r.cliente,
      vehiculo: r.ebikes ? `Ebike ${r.ebikes.numero}` : "Ebike",
    })),
  ];
}

async function calcularSaldos(db, hoy) {
  const cfg = await leerConfig(db, hoy);
  const { data: staff, error } = await db.from("staff").select("id, nombre, activo, comisiona, es_admin").order("nombre");
  if (error) throw new Error(error.message);
  const [rentas, pagos] = await Promise.all([
    rentasConComision(db, cfg.inicio, hoy, staff || []),
    todas(() => db.from("comision_pagos").select("id, staff_id, monto").eq("anulado", false).order("id")),
  ]);
  const calculo = calcularComisiones({ rentas, staff: staff || [], config: cfg });
  return { cfg, staff: staff || [], equipo: aplicarPagos(calculo, pagos, staff || []) };
}

// Lo único que ve un miembro del equipo: lo que le falta por cobrar y el
// detalle de esos días. Nunca montos rentados, clientes, tasa, pagos ni
// días ya pagados.
function vistaEquipo(propio, hoy) {
  if (!propio) return { porCobrar: 0, bonosPendientes: 0, pendienteDesde: null, hoy: null, dias: [] };
  const deHoy = propio.dias.find((d) => d.fecha === hoy);
  const pendientes = propio.dias.filter((d) => d.pendiente > 0);
  return {
    porCobrar: Math.max(0, propio.saldo),
    bonosPendientes: r2(pendientes.filter((d) => d.pagado === 0).reduce((a, d) => a + d.bono, 0)),
    pendienteDesde: propio.pendienteDesde,
    hoy: deHoy ? { comision: deHoy.comision, bono: deHoy.bono, llegoMeta: deHoy.llegoMeta, total: deHoy.total } : null,
    dias: pendientes.map((d) => ({
      fecha: d.fecha,
      pendiente: d.pendiente,
      parcial: d.pagado > 0,
      llegoMeta: d.llegoMeta,
      bono: d.bono,
    })),
  };
}

// GET: cada miembro ve lo que le falta por cobrar. Con ?vista=admin, un
// administrador ve a todo el equipo, los pagos y el historial.
export async function GET(req) {
  const db = supabaseServer();
  const yo = await sesionYStaff(req, db);
  if (!yo) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const vistaAdmin = new URL(req.url).searchParams.get("vista") === "admin";
  if (vistaAdmin && !yo.es_admin) return NextResponse.json({ error: "Solo un administrador puede ver esto." }, { status: 403 });

  const hoy = fechaHoyPanama();
  try {
    const { cfg, staff, equipo } = await calcularSaldos(db, hoy);
    const propio = equipo.miembros.find((x) => x.staffId === yo.id) || null;
    const respuesta = {
      hoy,
      config: { metaComision: r2((cfg.metaDiaria * cfg.tasa) / 100), bono: cfg.bono },
      comisiona: yo.comisiona !== false,
      mio: vistaEquipo(propio, hoy),
    };
    if (!vistaAdmin) return NextResponse.json(respuesta);

    const nombre = new Map(staff.map((s) => [s.id, s.nombre]));
    const [{ data: pagos, error: e1 }, { data: periodos, error: e2 }] = await Promise.all([
      db.from("comision_pagos")
        .select("id, staff_id, monto, forma, nota, fecha, pagado_por, creado_en, anulado, anulado_por, anulado_en")
        .order("creado_en", { ascending: false })
        .limit(300),
      db.from("comision_periodos").select("id, inicio, fin, total, detalle, pagado_en, pagado_por").order("fin", { ascending: false }).limit(50),
    ]);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

    return NextResponse.json({
      ...respuesta,
      inicio: cfg.inicio,
      configCompleta: cfg,
      equipo,
      staff: staff.map((s) => ({ id: s.id, nombre: s.nombre, activo: s.activo, comisiona: s.comisiona !== false })),
      pagos: (pagos || []).map((p) => ({ ...p, monto: Number(p.monto), nombre: nombre.get(p.staff_id) || "—" })),
      periodosAnteriores: periodos || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "No se pudieron calcular las comisiones." }, { status: 500 });
  }
}

// PATCH: solo administradores — cambiar la tasa/meta/bono, o marcar si un
// miembro del equipo cobra comisión.
export async function PATCH(req) {
  const db = supabaseServer();
  const yo = await sesionYStaff(req, db);
  if (!yo?.es_admin) return NextResponse.json({ error: "Solo un administrador puede cambiar esto." }, { status: 403 });
  const body = await req.json();

  if (body.accion === "config") {
    const actual = await leerConfig(db, fechaHoyPanama());
    const tasa = Number(body.tasa);
    const metaDiaria = Number(body.metaDiaria);
    const bono = Number(body.bono);
    if (!Number.isFinite(tasa) || tasa < 0 || tasa > 100) return NextResponse.json({ error: "La tasa debe estar entre 0 y 100%." }, { status: 400 });
    if (!Number.isFinite(metaDiaria) || metaDiaria < 0) return NextResponse.json({ error: "Escribe una meta válida (0 = sin meta)." }, { status: 400 });
    if (!Number.isFinite(bono) || bono < 0) return NextResponse.json({ error: "Escribe un bono válido." }, { status: 400 });
    const nuevo = { ...actual, tasa, metaDiaria, bono };
    const { error } = await db.from("configuracion").upsert({ clave: CLAVE, valor: JSON.stringify(nuevo) }, { onConflict: "clave" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, config: nuevo });
  }

  if (body.accion === "comisiona") {
    if (!body.staffId || typeof body.comisiona !== "boolean") return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    const { error } = await db.from("staff").update({ comisiona: body.comisiona }).eq("id", body.staffId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
}

// POST: solo administradores.
//  - accion "pagar": registra un pago (parcial o total) a un miembro.
//  - accion "anular": anula un pago hecho por error; el monto vuelve al saldo.
export async function POST(req) {
  const db = supabaseServer();
  const yo = await sesionYStaff(req, db);
  if (!yo?.es_admin) return NextResponse.json({ error: "Solo un administrador puede pagar comisiones." }, { status: 403 });

  const body = await req.json();
  const hoy = fechaHoyPanama();

  if (body.accion === "pagar") {
    const monto = r2(body.monto);
    const forma = FORMAS.includes(body.forma) ? body.forma : "efectivo";
    const nota = typeof body.nota === "string" ? body.nota.trim().slice(0, 200) : "";
    if (!body.staffId) return NextResponse.json({ error: "Elige a quién le pagas." }, { status: 400 });
    if (!Number.isFinite(monto) || monto <= 0) return NextResponse.json({ error: "Escribe un monto mayor que $0." }, { status: 400 });

    try {
      const { equipo } = await calcularSaldos(db, hoy);
      const miembro = equipo.miembros.find((m) => m.staffId === body.staffId);
      if (!miembro || miembro.saldo <= 0) return NextResponse.json({ error: "Este miembro no tiene comisiones por cobrar." }, { status: 400 });
      if (monto > miembro.saldo) {
        return NextResponse.json({ error: `El monto pasa de lo que tiene por cobrar ($${miembro.saldo.toFixed(2)}).` }, { status: 400 });
      }

      const { data: pago, error } = await db
        .from("comision_pagos")
        .insert({ staff_id: body.staffId, monto, forma, nota: nota || null, fecha: hoy, pagado_por: yo.nombre })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Si otro administrador le pagó al mismo tiempo y entre los dos se
      // pasaron del saldo, este pago se deshace.
      const despues = (await calcularSaldos(db, hoy)).equipo.miembros.find((m) => m.staffId === body.staffId);
      if (despues && despues.saldo < -0.004) {
        await db.from("comision_pagos").delete().eq("id", pago.id);
        return NextResponse.json({ error: "Alguien acaba de registrar otro pago a este miembro. Recarga la página." }, { status: 409 });
      }
      return NextResponse.json({ ok: true, pago, saldo: despues ? despues.saldo : r2(miembro.saldo - monto) });
    } catch (err) {
      return NextResponse.json({ error: err.message || "No se pudo registrar el pago." }, { status: 500 });
    }
  }

  if (body.accion === "anular") {
    if (!body.pagoId) return NextResponse.json({ error: "Falta el pago." }, { status: 400 });
    const { data, error } = await db
      .from("comision_pagos")
      .update({ anulado: true, anulado_en: new Date().toISOString(), anulado_por: yo.nombre })
      .eq("id", body.pagoId)
      .eq("anulado", false)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) return NextResponse.json({ error: "Ese pago no existe o ya estaba anulado." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
}
