// Lógica de precios de renta de motos y ebikes.
//
// Las tarifas ahora son configurables desde el Panel (pantalla "Precios"),
// guardadas en la base de datos. Estos valores de aquí son solo el
// RESPALDO que se usa si todavía nadie ha configurado nada — así la app
// nunca se rompe por falta de configuración.
export const TARIFAS_POR_DEFECTO = {
  navi: { dia: 25, especial: 20, nocturno: 10 },
  scooter: { dia: 30, especial: 25, nocturno: 10 },
};
export const TARIFA_EBIKE_DIA_POR_DEFECTO = 15;

export const EXTRAS_COBERTURAS_POR_DEFECTO = {
  coberturaPremium: 10,
  extras: [
    { id: "snorkel", nombre: "Snorkel", precioMoto: 5, notaMoto: "2x snorkel", precioEbike: 2, notaEbike: "1x snorkel" },
    { id: "rack", nombre: "Rack para tabla de surf", precioMoto: 5, precioEbike: 5 },
    { id: "bocina", nombre: "Bocina bluetooth", precioMoto: 5, precioEbike: 5 },
    { id: "tienda", nombre: "Tienda de campaña", precioMoto: 10, precioEbike: 10 },
  ],
};

// Calcula el total de los extras seleccionados (lista de ids) para un
// tipo de vehículo, usando la configuración vigente. Devuelve tanto el
// total como el detalle (para guardar el precio "congelado" en la renta).
export function calcularExtras(idsSeleccionados, config, tipoVehiculo) {
  const cfg = config || EXTRAS_COBERTURAS_POR_DEFECTO;
  const campoPrecio = tipoVehiculo === "ebike" ? "precioEbike" : "precioMoto";
  const campoNota = tipoVehiculo === "ebike" ? "notaEbike" : "notaMoto";
  const detalle = (cfg.extras || [])
    .filter((e) => (idsSeleccionados || []).includes(e.id))
    .map((e) => ({
      id: e.id,
      nombre: e.notaMoto || e.notaEbike ? e[campoNota] || e.nombre : e.nombre,
      precio: e[campoPrecio],
      devuelto: null,
    }));
  const total = detalle.reduce((suma, e) => suma + (e.precio || 0), 0);
  return { total, detalle };
}

export function diasEntre(isoA, isoB) {
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

function horaANumero(hora) {
  if (!hora) return 9;
  const [h, m] = hora.split(":").map(Number);
  return h + (m || 0) / 60;
}

// Reglas de precio (motos):
// 1) Mismo día, entrega antes de las 2:00pm  -> tarifa normal del día
// 2) Mismo día, entrega a partir de las 2:00pm -> tarifa especial (más baja)
// 3) Varios días, entrega antes de las 2:00pm -> tarifa normal × (días de diferencia + 1)
// 3b) Varios días, entrega entre las 2:00pm y las 5:00pm -> tarifa especial SOLO
//     el primer día + tarifa normal los días siguientes, incluyendo el día de
//     devolución.
// 4) Varios días, entrega a partir de las 5:00pm (se queda toda la noche) ->
//    tarifa nocturna (por la primera noche) + tarifa normal × días de diferencia
export function calcularTarifa({ tipoMoto, fechaEntrega, horaEntrega, fechaPrevista, tarifas }) {
  const todasTarifas = tarifas || TARIFAS_POR_DEFECTO;
  const t = todasTarifas[tipoMoto] || todasTarifas.navi;
  const dias = Math.max(0, diasEntre(fechaEntrega, fechaPrevista));
  const hora = horaANumero(horaEntrega);

  if (dias <= 0) {
    if (hora >= 14) return { total: t.especial, regla: "especial" };
    return { total: t.dia, regla: "dia" };
  }
  if (hora >= 17) {
    return { total: t.nocturno + t.dia * dias, regla: "nocturno", dias };
  }
  const diasCobrados = dias + 1;
  if (hora >= 14) {
    const total = t.especial + t.dia * (diasCobrados - 1);
    return { total, regla: "porDiasConEspecial", dias: diasCobrados };
  }
  return { total: t.dia * diasCobrados, regla: "porDias", dias: diasCobrados };
}

// ---- Ebikes ----
// Los ebikes tienen una tarifa fija por día. La hora de entrega no importa
// (a diferencia de las motos), solo cuántos días calendario dura la renta.
// Igual que las motos, cada día corre hasta las 7:00pm, así que el día de
// entrega y el día de devolución se cuentan completos.
export function calcularTarifaEbike({ fechaEntrega, fechaPrevista, tarifaDia }) {
  const dia = tarifaDia ?? TARIFA_EBIKE_DIA_POR_DEFECTO;
  const dias = Math.max(0, diasEntre(fechaEntrega, fechaPrevista)) + 1;
  return { total: dia * dias, dias };
}
