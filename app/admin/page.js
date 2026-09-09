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
const CLASE_ESTADO = { vencida: "vencida", "por vencer": "porvencer", activa: "activa", devuelta: "devuelta" };
function Badge({ estado }) {
  return (
    <span className={"v2-status " + (CLASE_ESTADO[estado] || "activa")}>
      <span className="d" />
      {estado}
    </span>
  );
}
function Stat({ label, value, tono }) {
  return (
    <div className="v2-stat">
      <div className={"n" + (tono ? " " + tono : "")}>{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}
function EtiquetaTipo({ tipo }) {
  return <span className="v2-tag">{tipo === "ebike" ? "Ebike" : "Moto"}</span>;
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
      <h1 className="v2-panel-h">Panel</h1>
      <p className="v2-panel-sub">Estado actual de la flota (motos + ebikes) y las rentas en curso.</p>

      <div className="v2-stat-row">
        <Stat label="Vehículos en flota" value={totalVehiculos} />
        <Stat label="Disponibles" value={Math.max(disponibles, 0)} tono="ok" />
        <Stat label="Rentados" value={rentasActivas.length} tono="warn" />
        <Stat label="Vencidos" value={vencidas} tono="bad" />
      </div>

      <h2 className="v2-sec-h">Rentas en curso</h2>
      {rentasActivas.length === 0 ? (
        <div className="v2-card" style={{ padding: 24, color: "var(--text-muted)", fontSize: 14.5 }}>
          No hay vehículos rentados en este momento. Ve a "Nueva renta" para registrar una.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rentasActivas.map((r) => (
            <div key={`${r._tipo}-${r.id}`} className="v2-row">
              <ImagenPrivada path={r.foto_carnet_url} alt="Carnet" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: 6 }} />
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{r.cliente}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{r.cedula}</div>
              </div>
              <EtiquetaTipo tipo={r._tipo} />
              <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{r._vehiculo}</div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Devuelve</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{formatoDia(r.fecha_prevista)}</div>
                </div>
                <Badge estado={estadoRenta(r)} />
                <button className="v2-btn-secondary" onClick={() => setContratoVisible(r)}>
                  Contrato ({r.idioma === "en" ? "EN" : "ES"})
                </button>
                <button className="v2-btn-secondary" onClick={() => marcarDevuelta(r)}>Marcar devuelta</button>
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
