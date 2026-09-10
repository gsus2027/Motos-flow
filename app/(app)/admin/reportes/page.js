"use client";
import { useEffect, useState } from "react";

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
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export default function PantallaReportes() {
  const [staffActual, setStaffActual] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [motos, setMotos] = useState([]);
  const [ebikes, setEbikes] = useState([]);

  const [desde, setDesde] = useState(haceUnaSemanaISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [filtroStaff, setFiltroStaff] = useState("");
  const [filtroVehiculo, setFiltroVehiculo] = useState("");

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth").then((r) => r.json()).then((d) => setStaffActual(d.staffActual || null));
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

  if (staffActual === null) {
    return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;
  }
  if (!staffActual.es_admin) {
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
        Ingresos por renta, con filtros de fecha, de quién la atendió, y de vehículo.
      </p>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, alignItems: "end" }}>
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

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "110px 110px 1fr 1fr 90px", padding: "12px 18px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" }}>
              <div>Fecha</div>
              <div>Vehículo</div>
              <div>Cliente</div>
              <div>Atendió</div>
              <div>Monto</div>
            </div>
            {datos.filas.length === 0 ? (
              <div style={{ padding: 20, color: "var(--text-muted)" }}>No hay rentas en este rango con esos filtros.</div>
            ) : (
              datos.filas.map((f) => (
                <div key={`${f.tipo}-${f.id}`} style={{ display: "grid", gridTemplateColumns: "110px 110px 1fr 1fr 90px", padding: "12px 18px", fontSize: 13.5, borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                  <div>{formatoFecha(f.fecha)}</div>
                  <div>{f.vehiculo}</div>
                  <div>{f.cliente}</div>
                  <div>{f.atendidoPor || "—"}</div>
                  <div style={{ fontWeight: 600 }}>${f.monto.toFixed(2)}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
