// Un contrato con varias motos (o varias e-bikes) — 18-oct-2026.
//
// Pedido de Jesús: cuando una pareja renta dos motos, uno solo llena el
// formulario. El trabajador agrega la otra moto desde el Panel y el
// contrato se actualiza solo.
//
// Cómo se guarda: cada vehículo sigue siendo su propia renta (así Flota,
// Rastreo, Calendario, devoluciones, extensiones y comisiones funcionan
// igual que siempre), pero las rentas agregadas apuntan a la renta del
// contrato original con `contrato_id`. La renta original tiene
// `contrato_id` vacío. Ver supabase-schema-contrato-multiple.sql.
import { calcularTarifa, calcularTarifaEbike, EXTRAS_COBERTURAS_POR_DEFECTO } from "@/lib/pricing";

const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const CONFIG = {
  moto: { tabla: "rentas", campo: "moto_id", tablaVehiculo: "motos", select: "*, motos(placa, modelo, tipo)" },
  ebike: { tabla: "rentas_ebike", campo: "ebike_id", tablaVehiculo: "ebikes", select: "*, ebikes(numero)" },
};

/** Clave del contrato al que pertenece una renta (la original o ella misma). */
export function claveContrato(renta) {
  return renta?.contrato_id || renta?.id;
}

/**
 * Agrupa rentas por contrato. Devuelve una lista de grupos, cada uno con la
 * renta original primero y las agregadas después (por fecha de agregado).
 */
export function agruparPorContrato(rentas) {
  const grupos = new Map();
  for (const r of rentas || []) {
    const k = `${r._tipo || ""}:${claveContrato(r)}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(r);
  }
  return [...grupos.values()].map((lista) =>
    lista.sort((a, b) => (a.contrato_id ? 1 : 0) - (b.contrato_id ? 1 : 0) || String(a.agregado_en || a.creado_en).localeCompare(String(b.agregado_en || b.creado_en)))
  );
}

/** Precio de un vehículo más con las mismas fechas y la misma cobertura del contrato (puro, para probarlo). */
export function precioVehiculoExtra({ tipo, original, tipoMoto, tarifas, cfgExtras }) {
  if (tipo === "ebike") {
    const res = calcularTarifaEbike({ fechaEntrega: original.fecha_entrega, fechaPrevista: original.fecha_prevista, tarifaDia: tarifas?.ebikeDia });
    return { total: r2(res.total), base: r2(res.total), cobertura: 0, dias: res.dias, regla: null };
  }
  const res = calcularTarifa({
    tipoMoto,
    fechaEntrega: original.fecha_entrega,
    horaEntrega: original.hora_entrega,
    fechaPrevista: original.fecha_prevista,
    tarifas,
  });
  const cfg = cfgExtras || EXTRAS_COBERTURAS_POR_DEFECTO;
  const cobertura = original.cobertura === "premium" ? r2(Number(cfg.coberturaPremium ?? 10) * res.dias) : 0;
  return { total: r2(res.total + cobertura), base: r2(res.total), cobertura, dias: res.dias, regla: res.regla };
}

async function leerConfig(db) {
  const [t, e] = await Promise.all([
    db.from("configuracion").select("valor").eq("clave", "tarifas").maybeSingle(),
    db.from("configuracion").select("valor").eq("clave", "extras_coberturas").maybeSingle(),
  ]);
  const parse = (v) => {
    try {
      return v ? JSON.parse(v) : undefined;
    } catch {
      return undefined;
    }
  };
  return { tarifas: parse(t.data?.valor), cfgExtras: parse(e.data?.valor) };
}

/**
 * Agrega un vehículo al contrato de `rentaId`. Con `soloPrecio` no guarda
 * nada: solo devuelve cuánto costaría (para la ventana del Panel).
 * @returns {{ status:number, body:object }}
 */
export async function agregarVehiculoAContrato({ db, tipo, rentaId, vehiculoId, sesion, soloPrecio = false }) {
  const cfg = CONFIG[tipo];
  if (!cfg) return { status: 400, body: { error: "Tipo de vehículo inválido." } };
  if (!vehiculoId) return { status: 400, body: { error: tipo === "moto" ? "Elige la moto que se agrega." : "Elige la e-bike que se agrega." } };

  const { data: renta } = await db.from(cfg.tabla).select("*").eq("id", rentaId).maybeSingle();
  if (!renta) return { status: 404, body: { error: "Esa renta no existe." } };
  const { data: original } = renta.contrato_id
    ? await db.from(cfg.tabla).select("*").eq("id", renta.contrato_id).maybeSingle()
    : { data: renta };
  const base = original || renta;
  if (renta.estado === "devuelta") return { status: 409, body: { error: "Esta renta ya fue devuelta." } };

  const { data: vehiculo } = await db.from(cfg.tablaVehiculo).select("*").eq("id", vehiculoId).maybeSingle();
  if (!vehiculo) return { status: 404, body: { error: "Ese vehículo no existe." } };
  const { data: ocupada } = await db.from(cfg.tabla).select("id").eq(cfg.campo, vehiculoId).eq("estado", "activa").maybeSingle();
  if (ocupada) return { status: 409, body: { error: "Ese vehículo ya está en otra renta activa, elige otro." } };

  // Mismas fechas que la renta desde la que se agrega (por si se extendió).
  const fechas = { ...base, fecha_entrega: renta.fecha_entrega, hora_entrega: renta.hora_entrega, fecha_prevista: renta.fecha_prevista };
  const { tarifas, cfgExtras } = await leerConfig(db);
  const precio = precioVehiculoExtra({ tipo, original: fechas, tipoMoto: vehiculo.tipo, tarifas, cfgExtras });
  if (soloPrecio) return { status: 200, body: { precio } };

  let agregadoPor = null;
  if (sesion?.staffId) {
    const { data: staff } = await db.from("staff").select("nombre").eq("id", sesion.staffId).maybeSingle();
    agregadoPor = staff?.nombre || null;
  }

  const fila = {
    [cfg.campo]: vehiculoId,
    contrato_id: base.id,
    agregado_por: agregadoPor,
    agregado_en: new Date().toISOString(),
    idioma: base.idioma,
    cliente: base.cliente,
    cedula: base.cedula,
    telefono: base.telefono,
    hotel: base.hotel,
    pais: base.pais,
    correo: base.correo,
    fecha_entrega: fechas.fecha_entrega,
    fecha_prevista: fechas.fecha_prevista,
    notas: base.notas,
    foto_carnet_url: base.foto_carnet_url,
    firma_cliente_url: base.firma_cliente_url,
    fecha_firma: base.fecha_firma,
    acepto_terminos: true,
    tarifa_total: precio.total,
    extras: [],
    // Cuenta como otra renta para quien atendió al cliente (comisiones).
    atendido_por: base.atendido_por,
    atendido_por_id: base.atendido_por_id,
  };
  if (tipo === "moto") {
    fila.hora_entrega = fechas.hora_entrega;
    fila.tarifa_regla = precio.regla;
    fila.cobertura = base.cobertura || "basica";
    fila.cobertura_precio = precio.cobertura;
  }

  const { data, error } = await db.from(cfg.tabla).insert(fila).select(cfg.select).single();
  if (error) {
    const falta = /contrato_id|agregado_/.test(String(error.message));
    return {
      status: 500,
      body: { error: falta ? "Falta correr supabase-schema-contrato-multiple.sql en Supabase." : error.message },
    };
  }
  return { status: 200, body: { renta: data, precio } };
}

/** Las rentas de un mismo contrato (la original y las agregadas), para el contrato y el correo. */
export async function rentasDelContrato({ db, tipo, renta }) {
  const cfg = CONFIG[tipo];
  const k = claveContrato(renta);
  const { data, error } = await db.from(cfg.tabla).select(cfg.select).or(`id.eq.${k},contrato_id.eq.${k}`);
  if (error) return [renta];
  return agruparPorContrato((data || []).map((r) => ({ ...r, _tipo: tipo })))[0] || [renta];
}
