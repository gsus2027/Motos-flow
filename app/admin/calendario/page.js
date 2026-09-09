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
    fetch("/api/rentas").then((r) => r.json()).then((d) => {
      setRentas((d.rentas || []).filter((r) => r.estado !== "devuelta"));
      setCargando(false);
    });
  }, []);

  const porFecha = useMemo(() => {
    const map = {};
    rentas.forEach((r) => {
      if (!map[r.fecha_prevista]) map[r.fecha_prevista] = [];
      map[r.fecha_prevista].push(r);
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
  const rentasDelDia = porFecha[diaSel] || [];

  return (
    <div>
      <h1 className="v2-panel-h">Calendario</h1>
      <p className="v2-panel-sub">Vista de las fechas de devolución por mes.</p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div className="v2-cal-card">
          <div className="v2-cal-head">
            <button className="v2-btn-secondary" onClick={() => cambiarMes(-1)} style={{ padding: "5px 11px" }}>‹</button>
            <div>{MESES[mes]} {anio}</div>
            <button className="v2-btn-secondary" onClick={() => cambiarMes(1)} style={{ padding: "5px 11px" }}>›</button>
          </div>
          <div className="v2-cal-grid" style={{ marginBottom: 4 }}>
            {DIAS.map((d) => <div key={d} className="v2-cal-dow">{d}</div>)}
          </div>
          <div className="v2-cal-grid">
            {celdas.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = isoDe(d);
              const items = porFecha[iso] || [];
              const esHoy = iso === hoyISO();
              const seleccionado = iso === diaSel;
              const tieneVencida = items.some((r) => estadoRenta(r) === "vencida");
              return (
                <button
                  key={i}
                  onClick={() => setDiaSel(iso)}
                  className={"v2-cal-cell" + (esHoy ? " today" : "") + (seleccionado ? " sel" : "")}
                >
                  {d}
                  {items.length > 0 && <span className={"v2-cal-dot" + (tieneVencida ? " bad" : "")} />}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <h2 className="v2-sec-h" style={{ fontSize: 16 }}>{formatoDia(diaSel)}</h2>
          {rentasDelDia.length === 0 ? (
            <div className="v2-card" style={{ padding: 20, color: "var(--text-muted)", fontSize: 14 }}>No hay devoluciones programadas este día.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rentasDelDia.map((r) => (
                <div key={r.id} className="v2-row" style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--text)" }}>{r.cliente}</div>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{r.motos?.placa}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
