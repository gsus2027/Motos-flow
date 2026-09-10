"use client";
import { useEffect, useMemo, useState } from "react";
import ContratoModal from "@/components/ContratoModal";
import ContratoModalEbike from "@/components/ContratoModalEbike";
import ImagenPrivada from "@/components/ImagenPrivada";

function formatoDia(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function Historial() {
  const [rentas, setRentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [contratoVisible, setContratoVisible] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/rentas").then((r) => r.json()),
      fetch("/api/rentas-ebike").then((r) => r.json()),
    ]).then(([rm, re]) => {
      const motos = (rm.rentas || [])
        .filter((r) => r.estado === "devuelta")
        .map((r) => ({ ...r, _tipo: "moto", _vehiculo: r.motos ? `${r.motos.placa} — ${r.motos.modelo}` : "—" }));
      const ebikes = (re.rentas || [])
        .filter((r) => r.estado === "devuelta")
        .map((r) => ({ ...r, _tipo: "ebike", _vehiculo: r.ebikes ? `Ebike ${r.ebikes.numero}` : "—" }));
      setRentas([...motos, ...ebikes]);
      setCargando(false);
    });
  }, []);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = [...rentas].sort((a, b) => (b.fecha_devolucion_real || "").localeCompare(a.fecha_devolucion_real || ""));
    if (!q) return base;
    return base.filter(
      (r) =>
        r.cliente?.toLowerCase().includes(q) ||
        r.cedula?.toLowerCase().includes(q) ||
        r._vehiculo?.toLowerCase().includes(q)
    );
  }, [rentas, busqueda]);

  if (cargando) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Historial</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>
        Rentas ya devueltas (motos y ebikes) — busca por cliente, cédula o vehículo para ver su contrato.
      </p>

      <div className="field" style={{ maxWidth: 360, marginBottom: 22 }}>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, cédula o vehículo…"
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--text-muted)", fontSize: 14.5 }}>
          {rentas.length === 0 ? "Todavía no hay rentas devueltas." : "No se encontró ninguna renta con esa búsqueda."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtradas.map((r) => (
            <div key={`${r._tipo}-${r.id}`} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <ImagenPrivada path={r.foto_carnet_url} alt="Carnet" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.cliente}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.cedula}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", background: "var(--panel-2)", padding: "2px 8px", borderRadius: 3, textTransform: "uppercase" }}>
                {r._tipo === "ebike" ? "Ebike" : "Moto"}
              </span>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{r._vehiculo}</div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Devuelta el</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{formatoDia(r.fecha_devolucion_real)}</div>
                </div>
                {r.tarifa_total != null && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Total cobrado</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>${Number(r.tarifa_total).toFixed(2)}</div>
                  </div>
                )}
                <button className="btn-secondary" onClick={() => setContratoVisible(r)}>Ver contrato</button>
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
