"use client";
import { useEffect, useMemo, useState } from "react";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function diasEntre(isoA, isoB) {
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.round((b - a) / 86400000);
}
function estadoRenta(r) {
  if (r.estado === "devuelta") return "devuelta";
  const dif = diasEntre(hoyISO(), r.fecha_prevista);
  if (dif < 0) return "vencida";
  if (dif <= 1) return "por vencer";
  return "activa";
}
function formatoDia(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function Calendario() {
  const [rentas, setRentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [diaSel, setDiaSel] = useState(hoyISO());

  useEffect(() => {
    Promise.all([
      fetch("/api/rentas").then((r) => r.json()),
      fetch("/api/rentas-ebike").then((r) => r.json()),
    ]).then(([rm, re]) => {
      const motos = (rm.rentas || [])
        .filter((r) => r.estado !== "devuelta")
        .map((r) => ({ ...r, _tipo: "moto", _vehiculo: r.motos ? `${r.motos.placa} — ${r.motos.modelo}` : "—" }));
      const ebikes = (re.rentas || [])
        .filter((r) => r.estado !== "devuelta")
        .map((r) => ({ ...r, _tipo: "ebike", _vehiculo: r.ebikes ? `Ebike ${r.ebikes.numero}` : "—" }));
      setRentas([...motos, ...ebikes]);
      setCargando(false);
    });
  }, []);

  // Cada renta activa aparece en el calendario en 2 fechas: el día que se
  // entregó (para ver qué se está recogiendo hoy) y el día que debe
  // devolverse (para ver qué vence hoy).
  const porFecha = useMemo(() => {
    const map = {};
    rentas.forEach((r) => {
      if (r.fecha_entrega) {
        if (!map[r.fecha_entrega]) map[r.fecha_entrega] = { entregas: [], devoluciones: [] };
        map[r.fecha_entrega].entregas.push(r);
      }
      if (r.fecha_prevista) {
        if (!map[r.fecha_prevista]) map[r.fecha_prevista] = { entregas: [], devoluciones: [] };
        map[r.fecha_prevista].devoluciones.push(r);
      }
    });
    return map;
  }, [rentas]);

  if (cargando) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;

  const primerDia = new Date(anio, mes, 1);
  let offset = primerDia.getDay() - 1;
  if (offset < 0) offset = 6;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  function cambiarMes(delta) {
    let m = mes + delta, a = anio;
    if (m < 0) { m = 11; a -= 1; }
    if (m > 11) { m = 0; a += 1; }
    setMes(m); setAnio(a);
  }
  function isoDe(d) {
    return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const delDia = porFecha[diaSel] || { entregas: [], devoluciones: [] };

  function estadoExtras(extras) {
    if (!Array.isArray(extras) || extras.length === 0) return { texto: "Sin extras por retornar", color: "var(--text-muted)" };
    const faltantes = extras.filter((e) => e.devuelto !== true);
    if (faltantes.length === 0) return { texto: `Extras: ${extras.map((e) => e.nombre).join(", ")}`, color: "var(--text-muted)" };
    return { texto: `Falta: ${faltantes.map((e) => e.nombre).join(", ")}`, color: "var(--danger)" };
  }

  function TarjetaRenta({ r }) {
    const ex = estadoExtras(r.extras);
    return (
      <div className="card" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14.5 }}>{r.cliente}</span>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 12, background: "var(--panel-2)", padding: "2px 8px", borderRadius: 6, display: "inline-block" }}>{r._vehiculo}</span>
            <div style={{ fontSize: 11.5, color: ex.color, marginTop: 3 }}>{ex.texto}</div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.7 }}>
          {r.telefono && <div>📞 {r.telefono}</div>}
          {r.hotel && <div>🏨 {r.hotel}</div>}
          {r.atendido_por && <div>👤 Atendió: {r.atendido_por}</div>}
          <div>🕒 Entrega: {formatoDia(r.fecha_entrega)} · Debe devolver: {formatoDia(r.fecha_prevista)}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Calendario</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>Entregas y devoluciones programadas por mes (motos y ebikes).</p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div className="card" style={{ padding: 20, width: 340, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button className="btn-secondary" onClick={() => cambiarMes(-1)} style={{ padding: "5px 11px" }}>‹</button>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16, textTransform: "capitalize" }}>{MESES[mes]} {anio}</div>
            <button className="btn-secondary" onClick={() => cambiarMes(1)} style={{ padding: "5px 11px" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {DIAS.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {celdas.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = isoDe(d);
              const info = porFecha[iso] || { entregas: [], devoluciones: [] };
              const total = info.entregas.length + info.devoluciones.length;
              const esHoy = iso === hoyISO();
              const seleccionado = iso === diaSel;
              const tieneVencida = info.devoluciones.some((r) => estadoRenta(r) === "vencida");
              return (
                <button key={i} onClick={() => setDiaSel(iso)} style={{
                  aspectRatio: "1",
                  border: seleccionado ? "2px solid var(--text)" : esHoy ? "1.5px solid var(--amber)" : "1px solid var(--border)",
                  borderRadius: 4, background: "var(--panel-2)", cursor: "pointer", display: "flex", flexDirection: "column", color: "var(--text)",
                  alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: seleccionado ? 700 : 500,
                }}>
                  {d}
                  {total > 0 && <span style={{ width: 5, height: 5, borderRadius: "50%", background: tieneVencida ? "#C0392B" : "#F0A202", marginTop: 2 }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16, margin: "0 0 12px" }}>{formatoDia(diaSel)}</h2>

          {delDia.entregas.length === 0 && delDia.devoluciones.length === 0 ? (
            <div className="card" style={{ padding: 20, color: "var(--text-muted)", fontSize: 14 }}>No hay entregas ni devoluciones programadas este día.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {delDia.devoluciones.length > 0 && (
                <div>
                  <div className="seccion-titulo" style={{ fontSize: 12 }}>Vehículos que deben retornar el día de hoy: ({delDia.devoluciones.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {delDia.devoluciones.map((r) => <TarjetaRenta key={`d-${r._tipo}-${r.id}`} r={r} />)}
                  </div>
                </div>
              )}
              {delDia.entregas.length > 0 && (
                <div>
                  <div className="seccion-titulo" style={{ fontSize: 12 }}>Vehículos alquilados el día de hoy: ({delDia.entregas.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {delDia.entregas.map((r) => <TarjetaRenta key={`e-${r._tipo}-${r.id}`} r={r} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
