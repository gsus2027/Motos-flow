// Lógica de precios de renta de motos.
// Misma lógica validada en la versión anterior (artefacto de Claude),
// ahora corriendo también en el servidor para que el precio final
// se calcule y se guarde de forma confiable (no editable desde el navegador).

export const TARIFAS = {
  navi: { dia: 25, especial: 20, nocturno: 10 },
  scooter: { dia: 30, especial: 25, nocturno: 10 },
};

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

// Reglas de precio:
// 1) Mismo día, entrega antes de las 2:00pm  -> tarifa normal del día
// 2) Mismo día, entrega a partir de las 2:00pm -> tarifa especial (más baja)
// 3) Varios días, entrega antes de las 2:00pm -> tarifa normal × (días de diferencia + 1)
// 3b) Varios días, entrega entre las 2:00pm y las 5:00pm -> tarifa especial SOLO
//     el primer día + tarifa normal los días siguientes, incluyendo el día de
//     devolución.
// 4) Varios días, entrega a partir de las 5:00pm (se queda toda la noche) ->
//    $10 nocturno (por la primera noche) + tarifa normal × días de diferencia
export function calcularTarifa({ tipoMoto, fechaEntrega, horaEntrega, fechaPrevista }) {
  const tarifas = TARIFAS[tipoMoto] || TARIFAS.navi;
  const dias = Math.max(0, diasEntre(fechaEntrega, fechaPrevista));
  const hora = horaANumero(horaEntrega);

  if (dias <= 0) {
    if (hora >= 14) return { total: tarifas.especial, regla: "especial" };
    return { total: tarifas.dia, regla: "dia" };
  }
  if (hora >= 17) {
    return { total: tarifas.nocturno + tarifas.dia * dias, regla: "nocturno", dias };
  }
  const diasCobrados = dias + 1;
  if (hora >= 14) {
    const total = tarifas.especial + tarifas.dia * (diasCobrados - 1);
    return { total, regla: "porDiasConEspecial", dias: diasCobrados };
  }
  return { total: tarifas.dia * diasCobrados, regla: "porDias", dias: diasCobrados };
}
