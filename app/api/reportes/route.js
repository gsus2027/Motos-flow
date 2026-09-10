import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";

async function requiereAdmin(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sesion = await tokenValido(token);
  if (!sesion) return false;
  const db = supabaseServer();
  const { data } = await db.from("staff").select("es_admin").eq("id", sesion.staffId).maybeSingle();
  return Boolean(data?.es_admin);
}

// GET: solo administradores — ingresos por renta, con filtros de fecha,
// de quién atendió, y de vehículo (moto o ebike).
export async function GET(req) {
  if (!(await requiereAdmin(req))) {
    return NextResponse.json({ error: "Solo un administrador puede ver esta sección." }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const desde = params.get("desde");
  const hasta = params.get("hasta");
  const staff = params.get("staff") || "";
  const vehiculo = params.get("vehiculo") || ""; // formato: "moto:<id>" o "ebike:<id>"

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Faltan las fechas del rango." }, { status: 400 });
  }

  const db = supabaseServer();
  const [tipoFiltro, idFiltro] = vehiculo ? vehiculo.split(":") : [null, null];

  let filas = [];

  if (!tipoFiltro || tipoFiltro === "moto") {
    let q = db
      .from("rentas")
      .select("id, cliente, fecha_entrega, tarifa_total, atendido_por, moto_id, motos(placa, tipo)")
      .gte("fecha_entrega", desde)
      .lte("fecha_entrega", hasta);
    if (staff) q = q.eq("atendido_por", staff);
    if (tipoFiltro === "moto" && idFiltro) q = q.eq("moto_id", idFiltro);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    filas = filas.concat(
      (data || []).map((r) => ({
        id: r.id,
        tipo: "moto",
        vehiculo: r.motos?.placa || "—",
        cliente: r.cliente,
        fecha: r.fecha_entrega,
        atendidoPor: r.atendido_por,
        monto: Number(r.tarifa_total) || 0,
      }))
    );
  }

  if (!tipoFiltro || tipoFiltro === "ebike") {
    let q = db
      .from("rentas_ebike")
      .select("id, cliente, fecha_entrega, tarifa_total, atendido_por, ebike_id, ebikes(numero)")
      .gte("fecha_entrega", desde)
      .lte("fecha_entrega", hasta);
    if (staff) q = q.eq("atendido_por", staff);
    if (tipoFiltro === "ebike" && idFiltro) q = q.eq("ebike_id", idFiltro);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    filas = filas.concat(
      (data || []).map((r) => ({
        id: r.id,
        tipo: "ebike",
        vehiculo: r.ebikes?.numero ? `Ebike ${r.ebikes.numero}` : "—",
        cliente: r.cliente,
        fecha: r.fecha_entrega,
        atendidoPor: r.atendido_por,
        monto: Number(r.tarifa_total) || 0,
      }))
    );
  }

  filas.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const totalIngresos = filas.reduce((s, f) => s + f.monto, 0);
  const porDia = {};
  for (const f of filas) {
    porDia[f.fecha] = (porDia[f.fecha] || 0) + f.monto;
  }

  return NextResponse.json({
    filas,
    resumen: {
      totalIngresos,
      totalRentas: filas.length,
      porDia,
    },
  });
}
