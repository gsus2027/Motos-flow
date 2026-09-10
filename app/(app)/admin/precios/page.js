"use client";
import RequiereAdmin from "@/components/RequiereAdmin";
import { useEffect, useState } from "react";

const CAMPO = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5 };

function Campo({ label, valor, onChange }) {
  return (
    <div className="field">
      <label style={CAMPO}>{label}</label>
      <input
        type="number"
        min="0"
        step="0.5"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function PantallaPreciosContenido() {
  const [tarifas, setTarifas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/precios")
      .then((r) => r.json())
      .then((d) => {
        setTarifas(d.tarifas);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  function set(ruta, valor) {
    setMensaje("");
    setTarifas((t) => {
      const copia = { ...t, navi: { ...t.navi }, scooter: { ...t.scooter } };
      if (ruta[0] === "ebikeDia") copia.ebikeDia = valor;
      else copia[ruta[0]][ruta[1]] = valor;
      return copia;
    });
  }

  async function guardar() {
    setError("");
    setMensaje("");
    setGuardando(true);
    try {
      const body = {
        navi: {
          dia: Number(tarifas.navi.dia),
          especial: Number(tarifas.navi.especial),
          nocturno: Number(tarifas.navi.nocturno),
        },
        scooter: {
          dia: Number(tarifas.scooter.dia),
          especial: Number(tarifas.scooter.especial),
          nocturno: Number(tarifas.scooter.nocturno),
        },
        ebikeDia: Number(tarifas.ebikeDia),
      };
      const res = await fetch("/api/precios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setMensaje("Precios guardados. Ya están activos en toda la app.");
    } catch (err) {
      setError(err.message || "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando || !tarifas) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 600, margin: 0 }}>Precios</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>
        Cambia las tarifas aquí cuando entres o salgas de temporada baja/alta — se aplican de inmediato, sin tocar código.
      </p>

      <div className="card" style={{ padding: 24, maxWidth: 620 }}>
        <div className="seccion-titulo">Honda Navi</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 8 }}>
          <Campo label="Tarifa del día ($)" valor={tarifas.navi.dia} onChange={(v) => set(["navi", "dia"], v)} />
          <Campo label="Tarifa especial ($)" valor={tarifas.navi.especial} onChange={(v) => set(["navi", "especial"], v)} />
          <Campo label="Tarifa nocturna ($)" valor={tarifas.navi.nocturno} onChange={(v) => set(["navi", "nocturno"], v)} />
        </div>

        <hr className="seccion-divisor" />
        <div className="seccion-titulo">Scooter</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 8 }}>
          <Campo label="Tarifa del día ($)" valor={tarifas.scooter.dia} onChange={(v) => set(["scooter", "dia"], v)} />
          <Campo label="Tarifa especial ($)" valor={tarifas.scooter.especial} onChange={(v) => set(["scooter", "especial"], v)} />
          <Campo label="Tarifa nocturna ($)" valor={tarifas.scooter.nocturno} onChange={(v) => set(["scooter", "nocturno"], v)} />
        </div>

        <hr className="seccion-divisor" />
        <div className="seccion-titulo">Ebike</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 8 }}>
          <Campo label="Tarifa por día ($)" valor={tarifas.ebikeDia} onChange={(v) => set(["ebikeDia"], v)} />
        </div>

        {mensaje && (
          <div style={{ marginTop: 18, background: "#E8F7ED", color: "#1E7A38", padding: 11, borderRadius: 6, fontSize: 13.5 }}>{mensaje}</div>
        )}
        {error && (
          <div style={{ marginTop: 18, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 11, borderRadius: 6, fontSize: 13.5 }}>{error}</div>
        )}

        <div style={{ marginTop: 22 }}>
          <button type="button" className="btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar precios"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PantallaPrecios() {
  return (
    <RequiereAdmin>
      <PantallaPreciosContenido />
    </RequiereAdmin>
  );
}
