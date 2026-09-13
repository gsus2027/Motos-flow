"use client";
import { useEffect, useMemo, useState } from "react";
import { useStaffActual } from "@/lib/staffContext";
import ContratoModal from "@/components/ContratoModal";
import ContratoModalEbike from "@/components/ContratoModalEbike";

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function haceUnaSemanaISO() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatoFecha(iso) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
function estadoExtras(extras) {
  if (!Array.isArray(extras) || extras.length === 0) return { texto: "—", color: "var(--text-muted)" };
  const faltantes = extras.filter((e) => e.devuelto !== true);
  if (faltantes.length === 0) return { texto: "Devueltos", color: "#1E7A38" };
  return { texto: `Falta: ${faltantes.map((e) => e.nombre).join(", ")}`, color: "var(--danger)" };
}

export default function PantallaReportes() {
  const { staffActual, cargando: cargandoStaff } = useStaffActual();
  const [staffList, setStaffList] = useState([]);
  const [motos, setMotos] = useState([]);
  const [ebikes, setEbikes] = useState([]);

  const [desde, setDesde] = useState(haceUnaSemanaISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [filtroStaff, setFiltroStaff] = useState("");
  const [filtroVehiculo, setFiltroVehiculo] = useState("");
  const [filtroPais, setFiltroPais] = useState("");

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [contratoVisible, setContratoVisible] = useState(null);

  useEffect(() => {
    fetch("/api/staff").then((r) => r.json()).then((d) => setStaffList(d.staff || []));
    fetch("/api/motos").then((r) => r.json()).then((d) => setMotos(d.motos || []));
    fetch("/api/ebikes").then((r) => r.json()).then((d) => setEbikes(d.ebikes || []));
  }, []);

  function buscar() {
    setError("");
    setCargando(true);
    const params = new URLSearchParams({ desde, hasta });
    if (filtroStaff) params.set("staff", filtroStaff);
    if (filtroVehiculo) params.set("vehiculo", filtroVehiculo);
    if (filtroPais) params.set("pais", filtroPais);
    fetch(`/api/reportes?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDatos(d);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message || "No se pudo cargar.");
        setCargando(false);
      });
  }

  useEffect(() => {
    if (staffActual?.es_admin) buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffActual]);

  const paisesDisponibles = useMemo(() => {
    if (!datos?.filas) return [];
    const set = new Set(datos.filas.map((f) => f.pais).filter(Boolean));
    return [...set].sort();
  }, [datos]);

  if (cargandoStaff) {
    return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;
  }
  if (!staffActual?.es_admin) {
    return (
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        Esta sección es solo para administradores. Si crees que deberías tener acceso, pídele a un administrador que te dé el rol desde &quot;Equipo&quot;.
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 600, margin: 0 }}>Dinero</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 22px" }}>
        Ingresos por renta, con filtros de fecha, de quién la atendió, de vehículo, y de país.
      </p>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, alignItems: "end" }}>
          <div className="field">
            <label>Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="field">
            <label>Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="field">
            <label>Trabajador</label>
            <select value={filtroStaff} onChange={(e) => setFiltroStaff(e.target.value)}>
              <option value="">Todos</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.nombre}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Vehículo</label>
            <select value={filtroVehiculo} onChange={(e) => setFiltroVehiculo(e.target.value)}>
              <option value="">Todos</option>
              <optgroup label="Motos">
                {motos.map((m) => (
                  <option key={m.id} value={`moto:${m.id}`}>{m.placa}</option>
                ))}
              </optgroup>
              <optgroup label="Ebikes">
                {ebikes.map((e) => (
                  <option key={e.id} value={`ebike:${e.id}`}>Ebike {e.numero}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="field">
            <label>País</label>
            <select value={filtroPais} onChange={(e) => setFiltroPais(e.target.value)}>
              <option value="">Todos</option>
              {paisesDisponibles.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="button" className="btn-primary" onClick={buscar} disabled={cargando}>
            {cargando ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 18, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 11, borderRadius: 6, fontSize: 13.5 }}>{error}</div>
      )}

      {datos && (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div className="card" style={{ padding: "16px 22px" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Ingresos totales</div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, color: "var(--amber)" }}>
                ${datos.resumen.totalIngresos.toFixed(2)}
              </div>
            </div>
            <div className="card" style={{ padding: "16px 22px" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Rentas en el rango</div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26 }}>
                {datos.resumen.totalRentas}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 980 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12 }}>
                  <th style={{ padding: "10px 12px" }}>Fecha</th>
                  <th style={{ padding: "10px 12px" }}>Hora</th>
                  <th style={{ padding: "10px 12px" }}>Vehículo</th>
                  <th style={{ padding: "10px 12px" }}>País</th>
                  <th style={{ padding: "10px 12px" }}>Cliente</th>
                  <th style={{ padding: "10px 12px" }}>Atendió</th>
                  <th style={{ padding: "10px 12px" }}>Retorno</th>
                  <th style={{ padding: "10px 12px" }}>Extras</th>
                  <th style={{ padding: "10px 12px" }}>Monto</th>
                  <th style={{ padding: "10px 12px" }}></th>
                </tr>
              </thead>
              <tbody>
                {datos.filas.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: 20, color: "var(--text-muted)" }}>No hay rentas en este rango con esos filtros.</td></tr>
                ) : (
                  datos.filas.map((f) => {
                    const ex = estadoExtras(f.extras);
                    return (
                      <tr key={`${f.tipo}-${f.id}`} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 12px" }}>{formatoFecha(f.fecha)}</td>
                        <td style={{ padding: "10px 12px" }}>{f.hora || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>{f.vehiculo}</td>
                        <td style={{ padding: "10px 12px" }}>{f.pais || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>{f.cliente}</td>
                        <td style={{ padding: "10px 12px" }}>{f.atendidoPor || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>{formatoFecha(f.fechaRetorno)}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12.5, color: ex.color }}>{ex.texto}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>${f.monto.toFixed(2)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <button className="btn-secondary" style={{ padding: "5px 12px", fontSize: 12.5 }} onClick={() => setContratoVisible(f)}>Ver contrato</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {contratoVisible && contratoVisible.tipo === "ebike" && (
        <ContratoModalEbike renta={contratoVisible.renta} ebike={contratoVisible.vehiculoObj} onCerrar={() => setContratoVisible(null)} />
      )}
      {contratoVisible && contratoVisible.tipo === "moto" && (
        <ContratoModal renta={contratoVisible.renta} moto={contratoVisible.vehiculoObj} onCerrar={() => setContratoVisible(null)} />
      )}
    </div>
  );
}
