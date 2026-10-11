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
