"use client";
import { useEffect, useMemo, useState } from "react";
import ContratoModal from "@/components/ContratoModal";
import ContratoModalEbike from "@/components/ContratoModalEbike";

function formatoDia(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function estadoExtras(extras) {
  if (!Array.isArray(extras) || extras.length === 0) return { texto: "—", color: "var(--text-muted)" };
  const faltantes = extras.filter((e) => e.devuelto !== true);
  if (faltantes.length === 0) return { texto: "Devueltos", color: "#1E7A38" };
  return { texto: `Falta: ${faltantes.map((e) => e.nombre).join(", ")}`, color: "var(--danger)" };
}

export default function Historial() {
  const [rentas, setRentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroVehiculo, setFiltroVehiculo] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [contratoVisible, setContratoVisible] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/rentas").then((r) => r.json()),
      fetch("/api/rentas-ebike").then((r) => r.json()),
    ]).then(([rm, re]) => {
      const motos = (rm.rentas || [])
        .filter((r) => r.estado === "devuelta")
        .map((r) => ({ ...r, _tipo: "moto", _vehiculo: r.motos?.placa || "—", _modelo: r.motos?.modelo || "" }));
      const ebikes = (re.rentas || [])
        .filter((r) => r.estado === "devuelta")
        .map((r) => ({ ...r, _tipo: "ebike", _vehiculo: r.ebikes ? `#${r.ebikes.numero}` : "—", _modelo: "" }));
      setRentas([...motos, ...ebikes]);
      setCargando(false);
    });
  }, []);

  const vehiculosDisponibles = useMemo(() => {
    const set = new Set(rentas.map((r) => r._vehiculo).filter(Boolean));
    return [...set].sort();
  }, [rentas]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let base = [...rentas].sort((a, b) => (b.fecha_entrega || "").localeCompare(a.fecha_entrega || ""));
    if (filtroVehiculo) base = base.filter((r) => r._vehiculo === filtroVehiculo);
    if (filtroFecha) base = base.filter((r) => r.fecha_entrega === filtroFecha);
    if (q) {
      base = base.filter(
        (r) =>
          r.cliente?.toLowerCase().includes(q) ||
          r.cedula?.toLowerCase().includes(q) ||
          r._vehiculo?.toLowerCase().includes(q)
      );
    }
    return base.slice(0, 10);
  }, [rentas, busqueda, filtroVehiculo, filtroFecha]);

  if (cargando) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Historial</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>
        Las últimas 10 rentas devueltas (motos y ebikes), de la entrega más reciente a la más antigua.
      </p>

      <div className="card" style={{ padding: 18, marginBottom: 22, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 2, minWidth: 200 }}>
          <label style={{ fontSize: 12.5 }}>Buscar</label>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Cliente, cédula o vehículo…" />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label style={{ fontSize: 12.5 }}>Vehículo</label>
          <select value={filtroVehiculo} onChange={(e) => setFiltroVehiculo(e.target.value)}>
            <option value="">Todos</option>
            {vehiculosDisponibles.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 150 }}>
          <label style={{ fontSize: 12.5 }}>Fecha de entrega</label>
          <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} />
        </div>
        {(busqueda || filtroVehiculo || filtroFecha) && (
          <button className="btn-secondary" onClick={() => { setBusqueda(""); setFiltroVehiculo(""); setFiltroFecha(""); }}>
            Quitar filtros
          </button>
        )}
      </div>

      {filtradas.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--text-muted)", fontSize: 14.5 }}>
          {rentas.length === 0 ? "Todavía no hay rentas devueltas." : "No se encontró ninguna renta con esos filtros."}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12 }}>
                <th style={{ padding: "10px 12px" }}>Cliente</th>
                <th style={{ padding: "10px 12px" }}>Trabajador</th>
                <th style={{ padding: "10px 12px" }}>Tipo</th>
                <th style={{ padding: "10px 12px" }}>Placa/N.°</th>
                <th style={{ padding: "10px 12px" }}>Entrega</th>
                <th style={{ padding: "10px 12px" }}>Retorno est.</th>
                <th style={{ padding: "10px 12px" }}>Retorno real</th>
                <th style={{ padding: "10px 12px" }}>Extras</th>
                <th style={{ padding: "10px 12px" }}>Total</th>
                <th style={{ padding: "10px 12px" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => {
                const ex = estadoExtras(r.extras);
                return (
                  <tr key={`${r._tipo}-${r.id}`} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{r.cliente}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{r.atendido_por || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", background: "var(--panel-2)", padding: "2px 8px", borderRadius: 3, textTransform: "uppercase" }}>
                        {r._tipo === "ebike" ? "Ebike" : "Moto"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{r._vehiculo}</td>
                    <td style={{ padding: "10px 12px" }}>{formatoDia(r.fecha_entrega)}</td>
                    <td style={{ padding: "10px 12px" }}>{formatoDia(r.fecha_prevista)}</td>
                    <td style={{ padding: "10px 12px" }}>{formatoDia(r.fecha_devolucion_real)}</td>
                    <td style={{ padding: "10px 12px", color: ex.color, fontSize: 12.5 }}>{ex.texto}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{r.tarifa_total != null ? `$${Number(r.tarifa_total).toFixed(2)}` : "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button className="btn-secondary" style={{ padding: "5px 12px", fontSize: 12.5 }} onClick={() => setContratoVisible(r)}>Ver contrato</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
