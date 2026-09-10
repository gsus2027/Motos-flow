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
      <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 26, margin: 0 }}>Calendario</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>Vista de las fechas de devolución por mes.</p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div className="card" style={{ padding: 20, width: 340 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button className="btn-secondary" onClick={() => cambiarMes(-1)} style={{ padding: "5px 11px" }}>‹</button>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, textTransform: "capitalize" }}>{MESES[mes]} {anio}</div>
            <button className="btn-secondary" onClick={() => cambiarMes(1)} style={{ padding: "5px 11px" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {DIAS.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 11.5, color: "#9C9484", fontWeight: 600 }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {celdas.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = isoDe(d);
              const items = porFecha[iso] || [];
              const esHoy = iso === hoyISO();
              const seleccionado = iso === diaSel;
              const tieneVencida = items.some((r) => estadoRenta(r) === "vencida");
              return (
                <button key={i} onClick={() => setDiaSel(iso)} style={{
                  aspectRatio: "1",
                  border: seleccionado ? "2px solid #22201C" : esHoy ? "1.5px solid #F0A202" : "1px solid #E4DECB",
                  borderRadius: 4, background: "var(--panel-2)", cursor: "pointer", display: "flex", flexDirection: "column", color: "var(--text)",
                  alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: seleccionado ? 700 : 500,
                }}>
                  {d}
                  {items.length > 0 && <span style={{ width: 5, height: 5, borderRadius: "50%", background: tieneVencida ? "#C0392B" : "#F0A202", marginTop: 2 }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, margin: "0 0 12px" }}>{formatoDia(diaSel)}</h2>
          {rentasDelDia.length === 0 ? (
            <div className="card" style={{ padding: 20, color: "var(--text-muted)", fontSize: 14 }}>No hay devoluciones programadas este día.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rentasDelDia.map((r) => (
                <div key={r.id} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.cliente}</div>
                  <span style={{ fontSize: 13 }}>{r.motos?.placa}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
