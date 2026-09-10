"use client";
import { useEffect, useState } from "react";
import ContratoModal from "@/components/ContratoModal";
import ContratoModalEbike from "@/components/ContratoModalEbike";
import ImagenPrivada from "@/components/ImagenPrivada";

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
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 30, fontWeight: 600, color: color || "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
function EtiquetaTipo({ tipo }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: "#6B6255", background: "#F3EEE2", padding: "2px 8px", borderRadius: 3, textTransform: "uppercase" }}>
      {tipo === "ebike" ? "Ebike" : "Moto"}
    </span>
  );
}

export default function Panel() {
  const [motos, setMotos] = useState([]);
  const [ebikes, setEbikes] = useState([]);
  const [rentas, setRentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [contratoVisible, setContratoVisible] = useState(null);

  async function cargar() {
    setCargando(true);
    const [rm, rr, re, rre] = await Promise.all([
      fetch("/api/motos").then((r) => r.json()),
      fetch("/api/rentas").then((r) => r.json()),
      fetch("/api/ebikes").then((r) => r.json()),
      fetch("/api/rentas-ebike").then((r) => r.json()),
    ]);
    setMotos(rm.motos || []);
    setEbikes(re.ebikes || []);
    const rentasMoto = (rr.rentas || []).map((r) => ({ ...r, _tipo: "moto", _vehiculo: r.motos ? `${r.motos.placa} — ${r.motos.modelo}` : "—" }));
    const rentasEbike = (rre.rentas || []).map((r) => ({ ...r, _tipo: "ebike", _vehiculo: r.ebikes ? `Ebike ${r.ebikes.numero}` : "—" }));
    setRentas([...rentasMoto, ...rentasEbike]);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function marcarDevuelta(r) {
    const endpoint = r._tipo === "ebike" ? "/api/rentas-ebike" : "/api/rentas";
    await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id }) });
    cargar();
  }

  if (cargando) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;

  const rentasActivas = rentas.filter((r) => r.estado !== "devuelta").sort((a, b) => a.fecha_prevista.localeCompare(b.fecha_prevista));
  const totalVehiculos = motos.length + ebikes.length;
  const disponibles = totalVehiculos - rentasActivas.length;
  const vencidas = rentasActivas.filter((r) => estadoRenta(r) === "vencida").length;

  return (
    <div>
      <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 26, margin: 0 }}>Panel</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>Estado actual de la flota (motos + ebikes) y las rentas en curso.</p>

      <div style={{ display: "flex", gap: 14, marginBottom: 30, flexWrap: "wrap" }}>
        <Stat label="Vehículos en flota" value={totalVehiculos} />
        <Stat label="Disponibles" value={Math.max(disponibles, 0)} color="#3F7D58" />
        <Stat label="Rentados" value={rentasActivas.length} color="#8A5A03" />
        <Stat label="Vencidos" value={vencidas} color="#C0392B" />
      </div>

      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 17, margin: "0 0 12px" }}>Rentas en curso</h2>
      {rentasActivas.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--text-muted)", fontSize: 14.5 }}>
          No hay vehículos rentados en este momento. Ve a "Nueva renta" para registrar una.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rentasActivas.map((r) => (
            <div key={`${r._tipo}-${r.id}`} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <ImagenPrivada path={r.foto_carnet_url} alt="Carnet" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: 4 }} />
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{r.cliente}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{r.cedula}</div>
              </div>
              <EtiquetaTipo tipo={r._tipo} />
              <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{r._vehiculo}</div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Devuelve</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{formatoDia(r.fecha_prevista)}</div>
                </div>
                <Badge estado={estadoRenta(r)} />
                <button className="btn-secondary" onClick={() => setContratoVisible(r)}>
                  Contrato ({r.idioma === "en" ? "EN" : "ES"})
                </button>
                <button className="btn-secondary" onClick={() => marcarDevuelta(r)}>Marcar devuelta</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contratoVisible && contratoVisible._tipo === "ebike" && (
        <ContratoModalEbike renta={contratoVisible} ebike={contratoVisible.ebikes} onCerrar={() => setContratoVisible(null)} />
      )}
      {contratoVisible && contratoVisible._tipo === "moto" && (
        <ContratoModal renta={contratoVisible} moto={contratoVisible.motos} onCerrar={() => setContratoVisible(null)} />
      )}
    </div>
  );
}
