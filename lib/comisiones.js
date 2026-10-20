// Cálculo de comisiones del equipo. Es "puro" (sin base de datos) para
// poder probarlo, y lo usan tanto la API como las pantallas.
//
// Regla del negocio: por cada miembro y cada día (fecha de entrega), se
// suma el total cobrado de sus rentas y la comisión es ese total ÷ 20 × 3,
// es decir, el 15%. Si ese día llega a la meta diaria, gana además un bono.

export const CONFIG_COMISIONES_POR_DEFECTO = {
  tasa: 15, // porcentaje (÷20×3 = 15%)
  metaDiaria: 150, // $ rentados en un día para ganar el bono (0 = sin meta)
  bono: 5, // $ fijos por cada día que llega a la meta
  inicio: null, // primer día que cuenta para comisiones (YYYY-MM-DD)
};

const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;

export function normalizarConfig(c) {
  const d = CONFIG_COMISIONES_POR_DEFECTO;
  const num = (v, def, max) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : def;
  };
  const inicio = typeof c?.inicio === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.inicio) ? c.inicio : d.inicio;
  return {
    tasa: num(c?.tasa, d.tasa, 100),
    metaDiaria: num(c?.metaDiaria, d.metaDiaria, 100000),
    bono: num(c?.bono, d.bono, 10000),
    inicio,
  };
}

// Primer día del mes de una fecha YYYY-MM-DD
export function primerDiaDelMes(iso) {
  return `${iso.slice(0, 7)}-01`;
}

// rentas: [{ id, tipo, fecha_entrega, tarifa_total, atendido_por_id, cliente, vehiculo }]
// staff:  [{ id, nombre, comisiona }]
export function calcularComisiones({ rentas, staff, config }) {
  const cfg = normalizarConfig(config);
  const porId = new Map((staff || []).map((s) => [s.id, s]));
  const grupos = new Map(); // staffId -> Map(fecha -> rentas[])
  let sinComision = 0;

  for (const r of rentas || []) {
    const s = porId.get(r.atendido_por_id);
    const monto = r2(r.tarifa_total);
    if (!s || s.comisiona === false) {
      sinComision += monto;
      continue;
    }
    if (!grupos.has(s.id)) grupos.set(s.id, new Map());
    const dias = grupos.get(s.id);
    if (!dias.has(r.fecha_entrega)) dias.set(r.fecha_entrega, []);
    dias.get(r.fecha_entrega).push({ ...r, monto });
  }

  const miembros = [];
  for (const [staffId, dias] of grupos) {
    const listaDias = [...dias.entries()]
      .map(([fecha, lista]) => {
        const rentado = r2(lista.reduce((a, x) => a + x.monto, 0));
        const comision = r2((rentado * cfg.tasa) / 100);
        const llegoMeta = cfg.metaDiaria > 0 && rentado >= cfg.metaDiaria;
        const bono = llegoMeta ? r2(cfg.bono) : 0;
        return {
          fecha,
          rentado,
          comision,
          bono,
          llegoMeta,
          total: r2(comision + bono),
          rentas: lista.map((x) => ({ id: x.id, tipo: x.tipo, cliente: x.cliente, vehiculo: x.vehiculo, monto: x.monto })),
        };
      })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

    const rentado = r2(listaDias.reduce((a, d) => a + d.rentado, 0));
    const comision = r2(listaDias.reduce((a, d) => a + d.comision, 0));
    const bonos = r2(listaDias.reduce((a, d) => a + d.bono, 0));
    miembros.push({
      staffId,
      nombre: porId.get(staffId).nombre,
      rentado,
      comision,
      bonos,
      metasCumplidas: listaDias.filter((d) => d.llegoMeta).length,
      total: r2(comision + bonos),
      dias: listaDias,
    });
  }

  miembros.sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
  return {
    config: cfg,
    miembros,
    total: r2(miembros.reduce((a, m) => a + m.total, 0)),
    rentado: r2(miembros.reduce((a, m) => a + m.rentado, 0)),
    sinComision: r2(sinComision),
  };
}

// Pagos parciales: cada miembro tiene un saldo que corre siempre
// (lo ganado menos lo pagado). Cada pago cubre primero los días más
// viejos; así se sabe qué días ya están pagados (desaparecen de la vista
// del equipo) y cuáles quedan pendientes, completos o "resto del día".
//
// pagos: [{ staff_id, monto }] — solo pagos vigentes (no anulados)
export function aplicarPagos(calculo, pagos, staff) {
  const pagadoPor = new Map();
  for (const p of pagos || []) {
    pagadoPor.set(p.staff_id, r2((pagadoPor.get(p.staff_id) || 0) + Number(p.monto || 0)));
  }
  const porId = new Map((staff || []).map((s) => [s.id, s]));

  const miembros = calculo.miembros.map((m) => {
    const pagado = pagadoPor.get(m.staffId) || 0;
    pagadoPor.delete(m.staffId);
    let resto = pagado;
    const cubiertos = new Map();
    for (const d of [...m.dias].sort((a, b) => (a.fecha < b.fecha ? -1 : 1))) {
      const cubierto = r2(Math.min(d.total, Math.max(0, resto)));
      resto = r2(resto - cubierto);
      cubiertos.set(d.fecha, cubierto);
    }
    const dias = m.dias.map((d) => {
      const pagadoDia = cubiertos.get(d.fecha) || 0;
      return { ...d, pagado: pagadoDia, pendiente: r2(d.total - pagadoDia) };
    });
    const pendientes = dias.filter((d) => d.pendiente > 0);
    return {
      ...m,
      ganado: m.total,
      pagado,
      saldo: r2(m.total - pagado),
      pendienteDesde: pendientes.length ? pendientes[pendientes.length - 1].fecha : null,
      dias,
    };
  });

  // Alguien con pagos pero sin comisiones calculadas (p. ej. se le quitó
  // "cobra comisión"): aparece igual para que el administrador lo vea.
  for (const [staffId, pagado] of pagadoPor) {
    if (pagado <= 0) continue;
    miembros.push({
      staffId, nombre: porId.get(staffId)?.nombre || "—",
      rentado: 0, comision: 0, bonos: 0, metasCumplidas: 0, total: 0,
      ganado: 0, pagado, saldo: r2(-pagado), pendienteDesde: null, dias: [],
    });
  }

  return {
    ...calculo,
    miembros,
    ganado: calculo.total,
    pagado: r2(miembros.reduce((a, m) => a + m.pagado, 0)),
    saldo: r2(miembros.reduce((a, m) => a + Math.max(0, m.saldo), 0)),
  };
}
