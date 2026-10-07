// Extender días y ajustar tarifa de una renta activa, desde el Panel.
// Lo usan las dos rutas (/api/rentas y /api/rentas-ebike) para que motos
// y ebikes calculen exactamente igual.
import { diasEntre, TARIFAS_POR_DEFECTO, TARIFA_EBIKE_DIA_POR_DEFECTO, EXTRAS_COBERTURAS_POR_DEFECTO } from "@/lib/pricing";

const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Cálculo puro (sin base de datos) del costo de agregar días a una renta.
// Los días nuevos se cobran a tarifa diaria normal, más la cobertura
// premium por día (si la tenía) y cada extra por día. Si un admin ya
// había ajustado el total (por ejemplo un descuento), ese ajuste se
// respeta: solo se SUMA el costo de los días nuevos.
export function calcularExtension({ renta, tipo, diasExtra, tarifas, cfgExtras, tipoMoto }) {
  const cfg = cfgExtras || EXTRAS_COBERTURAS_POR_DEFECTO;
  const t = tarifas || {};

  let tarifaDia;
  if (tipo === "ebike") {
    tarifaDia = Number(t.ebikeDia ?? TARIFA_EBIKE_DIA_POR_DEFECTO);
  } else {
    const porTipo = t[tipoMoto] || TARIFAS_POR_DEFECTO[tipoMoto] || t.navi || TARIFAS_POR_DEFECTO.navi;
    tarifaDia = Number(porTipo.dia);
  }
  const costoBase = r2(tarifaDia * diasExtra);

  const tienePremium = tipo !== "ebike" && renta.cobertura === "premium";
  const coberturaDia = tienePremium ? Number(cfg.coberturaPremium ?? 10) : 0;
  const costoCobertura = r2(coberturaDia * diasExtra);

  const campoPrecio = tipo === "ebike" ? "precioEbike" : "precioMoto";
  const lineasExtras = [];
  const extrasNuevos = (Array.isArray(renta.extras) ? renta.extras : []).map((e) => {
    // Precio por día: el guardado en la renta; si es una renta vieja que
    // no lo tiene, se deduce del precio/días, y si tampoco, de la config.
    let porDia = Number(e.precioPorDia);
    if (!Number.isFinite(porDia)) {
      if (Number(e.dias) > 0 && Number.isFinite(Number(e.precio))) porDia = Number(e.precio) / Number(e.dias);
      else porDia = Number((cfg.extras || []).find((x) => x.id === e.id)?.[campoPrecio] ?? 0);
    }
    const costo = r2(porDia * diasExtra);
    lineasExtras.push({ nombre: e.nombre, porDia: r2(porDia), costo });
    return {
      ...e,
      precioPorDia: r2(porDia),
      dias: (Number(e.dias) || 0) + diasExtra,
      precio: r2(Number(e.precio || 0) + costo),
    };
  });
  const costoExtras = r2(lineasExtras.reduce((s, l) => s + l.costo, 0));

  const total = r2(costoBase + costoCobertura + costoExtras);
  return {
    diasExtra,
    tarifaDia: r2(tarifaDia),
    costoBase,
    coberturaDia: r2(coberturaDia),
    costoCobertura,
    lineasExtras,
    costoExtras,
    total,
    totalAnterior: r2(renta.tarifa_total),
    nuevoTotal: r2(Number(renta.tarifa_total || 0) + total),
    extrasNuevos,
    nuevaCoberturaPrecio: r2(Number(renta.cobertura_precio || 0) + costoCobertura),
  };
}

function leerJson(valor) {
  try {
    return valor ? JSON.parse(valor) : undefined;
  } catch {
    return undefined;
  }
}

// Maneja las acciones "extender" y "ajustarTarifa" del PATCH. Devuelve
// { status, body } — la ruta solo lo convierte en respuesta. Devuelve
// null si la acción no es una de estas dos (la ruta sigue su flujo normal).
export async function manejarAjusteRenta({ db, tabla, tipo, body, sesion }) {
  const { id, accion } = body;
  if (accion !== "extender" && accion !== "ajustarTarifa") return null;

  const seleccion = tipo === "ebike" ? "*" : "*, motos(tipo)";
  const { data: renta } = await db.from(tabla).select(seleccion).eq("id", id).maybeSingle();
  if (!renta) return { status: 404, body: { error: "Esa renta no existe." } };
  if (renta.estado === "devuelta") {
    return { status: 409, body: { error: "Esta renta ya fue devuelta, no se puede modificar." } };
  }

  if (accion === "extender") {
    const nueva = String(body.nuevaFechaPrevista || "");
    if (!FECHA_ISO.test(nueva)) return { status: 400, body: { error: "Elige una fecha de devolución válida." } };
    const diasExtra = diasEntre(renta.fecha_prevista, nueva);
    if (!(diasExtra >= 1)) {
      return { status: 400, body: { error: "La nueva fecha debe ser posterior a la devolución actual." } };
    }
    if (diasExtra > 60) return { status: 400, body: { error: "No se pueden agregar más de 60 días de una vez." } };

    const [{ data: cT }, { data: cE }] = await Promise.all([
      db.from("configuracion").select("valor").eq("clave", "tarifas").maybeSingle(),
      db.from("configuracion").select("valor").eq("clave", "extras_coberturas").maybeSingle(),
    ]);
    const calculo = calcularExtension({
      renta,
      tipo,
      diasExtra,
      tarifas: leerJson(cT?.valor),
      cfgExtras: leerJson(cE?.valor),
      tipoMoto: renta.motos?.tipo,
    });

    // Vista previa: el Panel la pide antes de confirmar, sin guardar nada.
    if (body.soloCalcular) {
      const { extrasNuevos, ...resumen } = calculo;
      return { status: 200, body: { calculo: resumen } };
    }

    const cambios = {
      fecha_prevista: nueva,
      tarifa_total: calculo.nuevoTotal,
      extras: calculo.extrasNuevos,
      dias_extendidos: (Number(renta.dias_extendidos) || 0) + diasExtra,
    };
    if (tipo !== "ebike") cambios.cobertura_precio = calculo.nuevaCoberturaPrecio;

    const { data, error } = await db.from(tabla).update(cambios).eq("id", id).select().single();
    if (error) return { status: 500, body: { error: error.message } };
    const { extrasNuevos, ...resumen } = calculo;
    return { status: 200, body: { renta: data, calculo: resumen } };
  }

  // accion === "ajustarTarifa" — solo administradores
  const { data: staff } = await db.from("staff").select("nombre, es_admin").eq("id", sesion.staffId).maybeSingle();
  if (!staff?.es_admin) {
    return { status: 403, body: { error: "Solo un administrador puede ajustar la tarifa." } };
  }
  const nuevoTotal = Number(body.nuevoTotal);
  if (!Number.isFinite(nuevoTotal) || nuevoTotal < 0 || nuevoTotal > 10000) {
    return { status: 400, body: { error: "Escribe un total válido (entre $0 y $10,000)." } };
  }
  const motivo = String(body.motivo || "").trim().slice(0, 200);
  if (!motivo) return { status: 400, body: { error: "Escribe el motivo del ajuste." } };

  const cambios = {
    tarifa_total: r2(nuevoTotal),
    ajuste_motivo: motivo,
    ajustado_por: staff.nombre,
  };
  // El total original del formulario se guarda solo la primera vez, para
  // que ajustes posteriores no lo sobrescriban.
  if (renta.tarifa_original === null || renta.tarifa_original === undefined) {
    cambios.tarifa_original = r2(renta.tarifa_total);
  }
  const { data, error } = await db.from(tabla).update(cambios).eq("id", id).select().single();
  if (error) return { status: 500, body: { error: error.message } };
  return { status: 200, body: { renta: data } };
}
