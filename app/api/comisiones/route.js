import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { fechaHoyPanama } from "@/lib/pricing";
import { calcularComisiones, normalizarConfig, primerDiaDelMes } from "@/lib/comisiones";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CLAVE = "comisiones";
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function sumarDia(iso, n = 1) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

async function sesionYStaff(req, db) {
  const sesion = await tokenValido(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!sesion) return null;
  const { data } = await db.from("staff").select("id, nombre, es_admin, comisiona").eq("id", sesion.staffId).maybeSingle();
  return data || null;
}

// Lee la configuración. La primera vez fija el inicio del sistema de
// comisiones en el primer día del mes actual, para que las rentas viejas
// no entren de golpe en el primer periodo.
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

// Rentas todavía sin pagar (motos + ebikes) desde el inicio del sistema
// hasta la fecha indicada. Si una renta se registró tarde con una fecha
// de entrega de un periodo ya pagado, igual entra aquí: nunca se pierde.
async function rentasSinPagar(db, desde, hasta, staff) {
  const idPorNombre = new Map();
  for (const s of staff) idPorNombre.set(s.nombre, idPorNombre.has(s.nombre) ? null : s.id);

  const [m, e] = await Promise.all([
    db.from("rentas")
      .select("id, fecha_entrega, tarifa_total, atendido_por_id, atendido_por, cliente, motos(placa, modelo)")
      .is("comision_periodo_id", null)
      .gte("fecha_entrega", desde)
      .lte("fecha_entrega", hasta),
    db.from("rentas_ebike")
      .select("id, fecha_entrega, tarifa_total, atendido_por_id, atendido_por, cliente, ebikes(numero)")
      .is("comision_periodo_id", null)
      .gte("fecha_entrega", desde)
      .lte("fecha_entrega", hasta),
  ]);
  if (m.error) throw new Error(m.error.message);
  if (e.error) throw new Error(e.error.message);

  const quien = (r) => r.atendido_por_id || idPorNombre.get(r.atendido_por) || null;
  return [
    ...(m.data || []).map((r) => ({
      id: r.id, tipo: "moto", fecha_entrega: r.fecha_entrega, tarifa_total: r.tarifa_total,
      atendido_por_id: quien(r), cliente: r.cliente,
      vehiculo: r.motos ? `${r.motos.placa} — ${r.motos.modelo}` : "Moto",
    })),
    ...(e.data || []).map((r) => ({
      id: r.id, tipo: "ebike", fecha_entrega: r.fecha_entrega, tarifa_total: r.tarifa_total,
      atendido_por_id: quien(r), cliente: r.cliente,
      vehiculo: r.ebikes ? `Ebike ${r.ebikes.numero}` : "Ebike",
    })),
  ];
}

async function datosPeriodo(db, hoy, hasta) {
  const cfg = await leerConfig(db, hoy);
  const [{ data: staff }, { data: ultimo }] = await Promise.all([
    db.from("staff").select("id, nombre, activo, comisiona, es_admin").order("nombre"),
    db.from("comision_periodos").select("fin").order("fin", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const inicioPeriodo = ultimo?.fin ? sumarDia(ultimo.fin) : cfg.inicio;
  const rentas = await rentasSinPagar(db, cfg.inicio, hasta, staff || []);
  const calculo = calcularComisiones({ rentas, staff: staff || [], config: cfg });
  return { cfg, staff: staff || [], inicioPeriodo, ultimoFin: ultimo?.fin || null, rentas, calculo };
}

// GET: cada miembro del equipo ve sus propias comisiones del periodo abierto.
// Con ?vista=admin, un administrador ve además a todo el equipo y el historial.
export async function GET(req) {
  const db = supabaseServer();
  const yo = await sesionYStaff(req, db);
  if (!yo) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const hoy = fechaHoyPanama();
  try {
    const { cfg, staff, inicioPeriodo, calculo } = await datosPeriodo(db, hoy, hoy);
    // Al equipo solo se le envía lo que lleva en comisión: nunca los montos
    // rentados, los clientes ni la tasa (eso solo lo ve el administrador).
    const propio = calculo.miembros.find((x) => x.staffId === yo.id) || null;
    const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
    const mio = propio
      ? {
          total: propio.total,
          comision: propio.comision,
          bonos: propio.bonos,
          metasCumplidas: propio.metasCumplidas,
          dias: propio.dias.map((d) => ({ fecha: d.fecha, comision: d.comision, bono: d.bono, llegoMeta: d.llegoMeta, total: d.total })),
        }
      : null;
    const respuesta = {
      hoy,
      periodo: { inicio: inicioPeriodo, hasta: hoy },
      config: { metaComision: r2((cfg.metaDiaria * cfg.tasa) / 100), bono: cfg.bono },
      comisiona: yo.comisiona !== false,
      mio,
    };

    const vistaAdmin = new URL(req.url).searchParams.get("vista") === "admin";
    if (vistaAdmin) {
      if (!yo.es_admin) return NextResponse.json({ error: "Solo un administrador puede ver esto." }, { status: 403 });
      const { data: historial, error } = await db
        .from("comision_periodos")
        .select("id, inicio, fin, total, detalle, pagado_en, pagado_por")
        .order("fin", { ascending: false })
        .limit(50);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      respuesta.configCompleta = cfg;
      respuesta.equipo = calculo;
      respuesta.staff = staff.map((s) => ({ id: s.id, nombre: s.nombre, activo: s.activo, comisiona: s.comisiona !== false }));
      respuesta.historial = historial || [];
    }
    return NextResponse.json(respuesta);
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

// POST: solo administradores — pagar y cerrar el periodo abierto. Guarda
// una "foto" del detalle tal como se pagó y marca cada renta incluida, así
// el siguiente periodo empieza en cero y nada se paga dos veces.
export async function POST(req) {
  const db = supabaseServer();
  const yo = await sesionYStaff(req, db);
  if (!yo?.es_admin) return NextResponse.json({ error: "Solo un administrador puede pagar comisiones." }, { status: 403 });

  const body = await req.json();
  if (body.accion !== "cerrar") return NextResponse.json({ error: "Acción no válida." }, { status: 400 });

  const hoy = fechaHoyPanama();
  const fechaCorte = String(body.fechaCorte || "");
  if (!FECHA_ISO.test(fechaCorte)) return NextResponse.json({ error: "Elige una fecha de corte válida." }, { status: 400 });
  if (fechaCorte > hoy) return NextResponse.json({ error: "La fecha de corte no puede ser en el futuro." }, { status: 400 });

  try {
    const { cfg, inicioPeriodo, ultimoFin, rentas, calculo } = await datosPeriodo(db, hoy, fechaCorte);
    if (ultimoFin && fechaCorte <= ultimoFin) {
      return NextResponse.json({ error: "Esa fecha ya está dentro de un periodo pagado. Elige una fecha posterior." }, { status: 400 });
    }
    if (rentas.length === 0) {
      return NextResponse.json({ error: "No hay rentas pendientes de comisión hasta esa fecha." }, { status: 400 });
    }

    const { data: periodo, error } = await db
      .from("comision_periodos")
      .insert({
        inicio: inicioPeriodo <= fechaCorte ? inicioPeriodo : fechaCorte,
        fin: fechaCorte,
        total: calculo.total,
        detalle: calculo.miembros,
        config: { tasa: cfg.tasa, metaDiaria: cfg.metaDiaria, bono: cfg.bono, rentado: calculo.rentado, sinComision: calculo.sinComision },
        pagado_por: yo.nombre,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const idsMoto = rentas.filter((r) => r.tipo === "moto").map((r) => r.id);
    const idsEbike = rentas.filter((r) => r.tipo === "ebike").map((r) => r.id);
    const [um, ue] = await Promise.all([
      idsMoto.length
        ? db.from("rentas").update({ comision_periodo_id: periodo.id }).in("id", idsMoto).is("comision_periodo_id", null).select("id")
        : { data: [] },
      idsEbike.length
        ? db.from("rentas_ebike").update({ comision_periodo_id: periodo.id }).in("id", idsEbike).is("comision_periodo_id", null).select("id")
        : { data: [] },
    ]);
    const marcadas = (um.data?.length || 0) + (ue.data?.length || 0);
    if (um.error || ue.error || marcadas === 0) {
      // Otro administrador cerró el periodo al mismo tiempo, o falló el
      // marcado: se deshace este cierre para no pagar dos veces.
      await db.from("comision_periodos").delete().eq("id", periodo.id);
      return NextResponse.json({ error: "Este periodo ya fue cerrado. Recarga la página." }, { status: 409 });
    }

    return NextResponse.json({ ok: true, periodo });
  } catch (err) {
    return NextResponse.json({ error: err.message || "No se pudo cerrar el periodo." }, { status: 500 });
  }
}
