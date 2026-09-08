"use client";
import { useEffect, useState } from "react";

export default function Flota() {
  const [motos, setMotos] = useState([]);
  const [rentas, setRentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [tipo, setTipo] = useState("navi");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

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

  const idsOcupadas = new Set(rentas.filter((r) => r.estado !== "devuelta").map((r) => r.moto_id));

  async function agregar() {
    if (!placa.trim() || !modelo.trim()) return setError("Indica la placa y el modelo de la moto.");
    setError(""); setOk("");
    const res = await fetch("/api/motos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placa, modelo, tipo }),
    }).then((r) => r.json());
    if (res.error) return setError(res.error);
    setPlaca(""); setModelo("");
    setOk("Moto agregada a la lista de abajo.");
    cargar();
  }

  async function eliminar(id) {
    const res = await fetch("/api/motos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).then((r) => r.json());
    if (res.error) { setError(res.error); return; }
    cargar();
  }

  if (cargando) return <div style={{ color: "#6B6255" }}>Cargando…</div>;

  return (
    <div>
      <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 26, margin: 0 }}>Flota</h1>
      <p style={{ color: "#6B6255", fontSize: 14.5, margin: "6px 0 26px" }}>Agrega y administra las motos disponibles para renta.</p>

      <div className="card" style={{ padding: 20, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 26 }}>
        <div className="field" style={{ width: 160 }}>
          <label>Placa</label>
          <input value={placa} onChange={(e) => setPlaca(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} placeholder="AB-1234" />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label>Marca y modelo</label>
          <input value={modelo} onChange={(e) => setModelo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} placeholder="Yamaha XTZ 150" />
        </div>
        <div className="field" style={{ width: 190 }}>
          <label>Tipo (define la tarifa)</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="navi">Honda Navi — $25/día</option>
            <option value="scooter">Scooter — $30/día</option>
          </select>
        </div>
        <button type="button" onClick={agregar} className="btn-primary">Agregar moto</button>
        {error && <div style={{ width: "100%", color: "#C0392B", fontSize: 13.5 }}>{error}</div>}
        {ok && <div style={{ width: "100%", color: "#245939", fontSize: 13.5 }}>{ok}</div>}
      </div>

      {motos.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "#6B6255", fontSize: 14.5 }}>Aún no hay motos registradas.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {motos.map((m) => {
            const ocupada = idsOcupadas.has(m.id);
            return (
              <div key={m.id} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, letterSpacing: "1.5px", border: "2px solid #22201C", borderRadius: 4, padding: "3px 9px", background: "#fff" }}>
                  {m.placa}
                </span>
                <div style={{ fontSize: 14.5 }}>{m.modelo}</div>
                <span style={{ fontSize: 12, color: "#6B6255", background: "#F3EEE2", padding: "3px 9px", borderRadius: 3 }}>
                  {m.tipo === "scooter" ? "Scooter" : "Honda Navi"}
                </span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: ocupada ? "#8A5A03" : "#245939", fontWeight: 600 }}>
                    {ocupada ? "alquilada" : "disponible"}
                  </span>
                  <button
                    className="btn-secondary btn-danger"
                    disabled={ocupada}
                    onClick={() => eliminar(m.id)}
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
