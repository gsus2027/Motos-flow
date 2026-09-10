"use client";
import { useEffect, useState } from "react";

export default function FlotaEbikes() {
  const [ebikes, setEbikes] = useState([]);
  const [rentas, setRentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [numero, setNumero] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function cargar() {
    setCargando(true);
    const [re, rr] = await Promise.all([
      fetch("/api/ebikes").then((r) => r.json()),
      fetch("/api/rentas-ebike").then((r) => r.json()),
    ]);
    setEbikes(re.ebikes || []);
    setRentas(rr.rentas || []);
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  const idsOcupadas = new Set(rentas.filter((r) => r.estado !== "devuelta").map((r) => r.ebike_id));

  async function agregar() {
    if (!numero.trim()) return setError("Indica el número de la ebike.");
    setError(""); setOk("");
    const res = await fetch("/api/ebikes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero }),
    }).then((r) => r.json());
    if (res.error) return setError(res.error);
    setNumero("");
    setOk("Ebike agregada a la lista de abajo.");
    cargar();
  }

  async function eliminar(id) {
    const res = await fetch("/api/ebikes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).then((r) => r.json());
    if (res.error) { setError(res.error); return; }
    cargar();
  }

  if (cargando) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Flota de Ebikes</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>Agrega y administra las bicicletas eléctricas disponibles ($15/día c/u).</p>

      <div className="card" style={{ padding: 20, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 26 }}>
        <div className="field" style={{ width: 220 }}>
          <label>Número de la ebike</label>
          <input value={numero} onChange={(e) => setNumero(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} placeholder="E-01" />
        </div>
        <button type="button" onClick={agregar} className="btn-primary">Agregar ebike</button>
        {error && <div style={{ width: "100%", color: "var(--danger)", fontSize: 13.5 }}>{error}</div>}
        {ok && <div style={{ width: "100%", color: "#1E7A38", fontSize: 13.5 }}>{ok}</div>}
      </div>

      {ebikes.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--text-muted)", fontSize: 14.5 }}>Aún no hay ebikes registradas.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ebikes.map((e) => {
            const ocupada = idsOcupadas.has(e.id);
            return (
              <div key={e.id} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 15, letterSpacing: "1.5px", border: "2px solid #1a1a1a", borderRadius: 4, padding: "3px 9px", background: "#fff", color: "#1a1a1a" }}>
                  Ebike {e.numero}
                </span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: ocupada ? "#8A5A03" : "#1E7A38", fontWeight: 600 }}>
                    {ocupada ? "alquilada" : "disponible"}
                  </span>
                  <button
                    className="btn-secondary btn-danger"
                    disabled={ocupada}
                    onClick={() => eliminar(e.id)}
                    style={{ opacity: ocupada ? 0.4 : 1, cursor: ocupada ? "not-allowed" : "pointer" }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
