"use client";
import { useEffect, useState } from "react";
import ContratoModal from "@/components/ContratoModal";

function formatoDia(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function diasEntre(isoA, isoB) {
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.round((b - a) / 86400000);
}
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function estadoRenta(r) {
  if (r.estado === "devuelta") return "devuelta";
  const dif = diasEntre(hoyISO(), r.fecha_prevista);
  if (dif < 0) return "vencida";
  if (dif <= 1) return "por vencer";
  return "activa";
}
const ESTILOS = {
  vencida: { bg: "#F6DEDA", fg: "#8E2A1C", dot: "#C0392B" },
  "por vencer": { bg: "#FBEACB", fg: "#8A5A03", dot: "#F0A202" },
  activa: { bg: "#DCEAE1", fg: "#245939", dot: "#3F7D58" },
};
function Badge({ estado }) {
  const s = ESTILOS[estado] || ESTILOS.activa;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: s.bg, color: s.fg, padding: "3px 10px", borderRadius: 3, fontSize: 12.5, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {estado}
    </span>
  );
}
function Stat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: "16px 22px", minWidth: 140 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 30, fontWeight: 600, color: color || "#22201C" }}>{value}</div>
      <div style={{ fontSize: 13, color: "#6B6255", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Panel() {
  const [motos, setMotos] = useState([]);
  const [rentas, setRentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [contratoVisible, setContratoVisible] = useState(null);

  async function cargar() {
    setCargando(true);
    const [rm, rr] = await Promise.all([
      fetch("/api/motos").then((r) => r.json()),
      fetch("/api/rentas").then((r) => r.json()),
    ]);
    setMotos(rm.motos || []);
    setRentas(rr.rentas || []);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function marcarDevuelta(id) {
    await fetch("/api/rentas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    cargar();
  }

  if (cargando) return <div style={{ color: "#6B6255" }}>Cargando…</div>;

  const rentasActivas = rentas.filter((r) => r.estado !== "devuelta").sort((a, b) => a.fecha_prevista.localeCompare(b.fecha_prevista));
  const disponibles = motos.length - rentasActivas.length;
  const vencidas = rentasActivas.filter((r) => estadoRenta(r) === "vencida").length;

  return (
    <div>
      <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 26, margin: 0 }}>Panel</h1>
      <p style={{ color: "#6B6255", fontSize: 14.5, margin: "6px 0 26px" }}>Estado actual de la flota y las rentas en curso.</p>

      <div style={{ display: "flex", gap: 14, marginBottom: 30, flexWrap: "wrap" }}>
        <Stat label="Motos en flota" value={motos.length} />
        <Stat label="Disponibles" value={Math.max(disponibles, 0)} color="#3F7D58" />
        <Stat label="Rentadas" value={rentasActivas.length} color="#8A5A03" />
        <Stat label="Vencidas" value={vencidas} color="#C0392B" />
      </div>

      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 17, margin: "0 0 12px" }}>Rentas en curso</h2>
      {rentasActivas.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "#6B6255", fontSize: 14.5 }}>
          No hay motos rentadas en este momento. Ve a "Nueva renta" para registrar una.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rentasActivas.map((r) => (
            <div key={r.id} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {r.foto_carnet_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.foto_carnet_url} alt="Carnet" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: 4 }} />
              ) : (
                <div style={{ width: 46, height: 46, borderRadius: 4, background: "#F3EEE2" }} />
              )}
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{r.cliente}</div>
                <div style={{ fontSize: 12.5, color: "#6B6255" }}>{r.cedula}</div>
              </div>
              <div style={{ fontSize: 13.5, color: "#6B6255" }}>{r.motos?.placa} — {r.motos?.modelo}</div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#6B6255" }}>Devuelve</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{formatoDia(r.fecha_prevista)}</div>
                </div>
                <Badge estado={estadoRenta(r)} />
                <button className="btn-secondary" onClick={() => setContratoVisible({ renta: r, moto: r.motos })}>
                  Contrato ({r.idioma === "en" ? "EN" : "ES"})
                </button>
                <button className="btn-secondary" onClick={() => marcarDevuelta(r.id)}>Marcar devuelta</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contratoVisible && (
        <ContratoModal renta={contratoVisible.renta} moto={contratoVisible.moto} onCerrar={() => setContratoVisible(null)} />
      )}
    </div>
  );
}
