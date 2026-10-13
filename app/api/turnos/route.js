import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { r2, inicioDiaPanama, finDiaPanama } from "@/lib/cobros";

export const dynamic = "force-dynamic";

// Turnos de caja (cuadre de pagos, etapa 3, 13-oct-2026). Ver supabase-schema-turnos.sql.
const CAJA = "principal";
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function leerMonto(valor) {
  const limpio = String(valor ?? "").replace(/[$\s]/g, "").replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < 0 || n > 1000000) return null;
  return r2(n);
}

function faltaTabla(error) {
  const msg = String(error?.message || "");
  return Boolean(error && (error.code === "42P01" || error.code === "PGRST205" || (msg.includes("turnos") && (msg.includes("does not exist") || msg.includes("schema cache")))));
}

async function staffDeRequest(req, db) {
  const sesion = await tokenValido(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!sesion) return null;
  const { data } = await db.from("staff").select("id, nombre, es_admin").eq("id", sesion.staffId).maybeSingle();
  return data || null;
}

async function turnoAbierto(db) {
  const { data, error } = await db.from("turnos").select("*").eq("caja", CAJA).is("cerrado_en", null).maybeSingle();
  if (error) {
    if (faltaTabla(error)) return { sinTabla: true, turno: null };
    throw error;
  }
  return { sinTabla: false, turno: data || null };
}

async function ultimoCerrado(db) {
  const { data } = await db
    .from("turnos")
    .select("*")
    .eq("caja", CAJA)
    .not("cerrado_en", "is", null)
    .order("cerrado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

// Cobros entre dos momentos (de todo el equipo: la caja es una sola).
async function resumenEntre(db, desdeIso, hastaIso) {
  const { data } = await db
    .from("cobros")
    .select("id, monto, metodo, autorizacion_ult4, cobrado_por_nombre, creado_en, renta_tipo, renta_id")
    .gte("creado_en", desdeIso)
    .lte("creado_en", hastaIso)
    .order("creado_en", { ascending: true });
  const cobros = data || [];
  const porMetodo = {};
  for (const c of cobros) {
    porMetodo[c.metodo] = porMetodo[c.metodo] || { cantidad: 0, monto: 0 };
    porMetodo[c.metodo].cantidad += 1;
    porMetodo[c.metodo].monto = r2(porMetodo[c.metodo].monto + Number(c.monto || 0));
  }
  return { cobros, porMetodo, efectivo: porMetodo.efectivo?.monto || 0 };
}

async function cerrar(db, turno, { contado, salidas = 0, salidasNota, nota, cerradoPorNombre }) {
  const r = await resumenEntre(db, turno.abierto_en, new Date().toISOString());
  const esperado = r2(Number(turno.fondo_inicial || 0) + r.efectivo - salidas);
  const { data, error } = await db
    .from("turnos")
    .update({
      cerrado_en: new Date().toISOString(),
      efectivo_cobrado: r.efectivo,
      salidas: r2(salidas),
      salidas_nota: salidasNota?.trim() || null,
      efectivo_esperado: esperado,
      efectivo_contado: r2(contado),
      diferencia: r2(contado - esperado),
      cerrado_por_nombre: cerradoPorNombre || null,
      nota_cierre: nota?.trim() || null,
    })
    .eq("id", turno.id)
    .is("cerrado_en", null)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// GET — solo staff.
//   sin parámetros → { turno (abierto), esMio, ultimoCerrado, resumen (si es mío) }
//   ?fecha=YYYY-MM-DD → turnos que empezaron ese día (Cierre del día)
export async function GET(req) {
  const db = supabaseServer();
  const staff = await staffDeRequest(req, db);
  if (!staff) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const fecha = new URL(req.url).searchParams.get("fecha");
  try {
    if (fecha) {
      if (!FECHA_ISO.test(fecha)) return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
      const { data, error } = await db
        .from("turnos")
        .select("*")
        .gte("abierto_en", inicioDiaPanama(fecha))
        .lte("abierto_en", finDiaPanama(fecha))
        .order("abierto_en", { ascending: true });
      if (error) {
        if (faltaTabla(error)) return NextResponse.json({ sinTabla: true, turnos: [] });
        throw error;
      }
      return NextResponse.json({ turnos: data || [] });
    }
    const { sinTabla, turno } = await turnoAbierto(db);
    if (sinTabla) return NextResponse.json({ sinTabla: true });
    const esMio = Boolean(turno && turno.usuario_id === staff.id);
    const resumen = esMio ? await resumenEntre(db, turno.abierto_en, new Date().toISOString()) : null;
    return NextResponse.json({
      turno,
      esMio,
      ultimoCerrado: turno ? null : await ultimoCerrado(db),
      resumen: resumen ? { ...resumen, fondo: Number(turno.fondo_inicial || 0) } : null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Error leyendo turnos." }, { status: 500 });
  }
}

// POST — solo staff.
//   { accion: "abrir", contado }  → empieza el turno de quien tiene la sesión
//      (si hay uno abierto de otra persona, ese conteo lo cierra).
//   { accion: "cerrar", contado, salidas, salidasNota, nota } → cierra el suyo
//      y cierra la sesión del panel.
export async function POST(req) {
  const db = supabaseServer();
  const staff = await staffDeRequest(req, db);
  if (!staff) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const contado = leerMonto(body.contado);
  if (contado === null) return NextResponse.json({ error: "Escribe cuánto efectivo contaste en la caja (puede ser 0)." }, { status: 400 });

  try {
    const { sinTabla, turno } = await turnoAbierto(db);
    if (sinTabla) return NextResponse.json({ error: "Falta correr supabase-schema-turnos.sql en Supabase." }, { status: 409 });

    if (body.accion === "abrir") {
      if (turno && turno.usuario_id === staff.id) return NextResponse.json({ turno });
      let anterior = null;
      let entregado = null;
      if (turno) {
        anterior = await cerrar(db, turno, { contado, cerradoPorNombre: staff.nombre, nota: `Cerrado al empezar el turno de ${staff.nombre} (no se cerró antes).` });
        entregado = contado;
      } else {
        anterior = await ultimoCerrado(db);
        entregado = anterior ? Number(anterior.efectivo_contado) : null;
      }
      const { data, error } = await db
        .from("turnos")
        .insert({
          caja: CAJA,
          usuario_id: staff.id,
          usuario_nombre: staff.nombre,
          turno_anterior_id: anterior?.id || null,
          entregado_por_anterior: entregado,
          fondo_inicial: contado,
          diferencia_al_recibir: entregado === null ? null : r2(contado - entregado),
        })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") return NextResponse.json({ error: "Alguien acaba de empezar un turno. Vuelve a cargar la página." }, { status: 409 });
        throw error;
      }
      return NextResponse.json({ turno: data });
    }

    if (body.accion === "cerrar") {
      if (!turno || turno.usuario_id !== staff.id) {
        return NextResponse.json({ error: turno ? `El turno abierto es de ${turno.usuario_nombre}, no tuyo.` : "No tienes un turno abierto." }, { status: 409 });
      }
      const salidas = leerMonto(body.salidas) ?? 0;
      if (salidas > 0 && !String(body.salidasNota || "").trim()) {
        return NextResponse.json({ error: "Escribe en qué se usó el efectivo que salió de la caja." }, { status: 400 });
      }
      const cerrado = await cerrar(db, turno, { contado, salidas, salidasNota: body.salidasNota, nota: body.nota, cerradoPorNombre: staff.nombre });
      const res = NextResponse.json({ turno: cerrado });
      // Al cerrar el turno se cierra la sesión: el siguiente entra con la suya.
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Error guardando el turno." }, { status: 500 });
  }
}
