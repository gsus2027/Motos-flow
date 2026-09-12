"use client";
import RequiereAdmin from "@/components/RequiereAdmin";
import { useEffect, useState } from "react";

const CAMPO = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5 };

function PantallaExtrasContenido() {
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/extras")
      .then((r) => r.json())
      .then((d) => {
        setConfig(d);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  function setExtra(i, campo, valor) {
    setMensaje("");
    setConfig((c) => {
      const extras = c.extras.map((e, idx) => (idx === i ? { ...e, [campo]: valor } : e));
      return { ...c, extras };
    });
  }

  async function guardar() {
    setError("");
    setMensaje("");
    setGuardando(true);
    try {
      const body = {
        coberturaPremium: Number(config.coberturaPremium),
        extras: config.extras.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          precioMoto: Number(e.precioMoto),
          precioEbike: Number(e.precioEbike),
          notaMoto: e.notaMoto || undefined,
          notaEbike: e.notaEbike || undefined,
        })),
      };
      const res = await fetch("/api/extras", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setConfig(res);
      setMensaje("Cambios guardados. Ya están activos en los formularios de renta.");
    } catch (err) {
      setError(err.message || "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando || !config) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 600, margin: 0 }}>Extras y coberturas</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>
        Cambia aquí los nombres y precios que ven los clientes al rentar — se aplican de inmediato.
      </p>

      <div className="card" style={{ padding: 24, maxWidth: 680, marginBottom: 20 }}>
        <div className="seccion-titulo">Cobertura premium (solo motos)</div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label style={CAMPO}>Precio ($)</label>
          <input
            type="number" min="0" step="0.5"
            value={config.coberturaPremium}
            onChange={(e) => { setMensaje(""); setConfig((c) => ({ ...c, coberturaPremium: e.target.value })); }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 680 }}>
        <div className="seccion-titulo">Extras (motos y ebikes)</div>
        {config.extras.map((ex, i) => (
          <div key={ex.id} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: i < config.extras.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div className="field" style={{ marginBottom: 10 }}>
              <label style={CAMPO}>Nombre</label>
              <input value={ex.nombre} onChange={(e) => setExtra(i, "nombre", e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="field">
                <label style={CAMPO}>Precio en moto ($)</label>
                <input type="number" min="0" step="0.5" value={ex.precioMoto} onChange={(e) => setExtra(i, "precioMoto", e.target.value)} />
              </div>
              <div className="field">
                <label style={CAMPO}>Precio en ebike ($)</label>
                <input type="number" min="0" step="0.5" value={ex.precioEbike} onChange={(e) => setExtra(i, "precioEbike", e.target.value)} />
              </div>
              <div className="field">
                <label style={CAMPO}>Texto para moto (opcional, ej. "2x snorkel")</label>
                <input value={ex.notaMoto || ""} onChange={(e) => setExtra(i, "notaMoto", e.target.value)} placeholder={ex.nombre} />
              </div>
              <div className="field">
                <label style={CAMPO}>Texto para ebike (opcional, ej. "1x snorkel")</label>
                <input value={ex.notaEbike || ""} onChange={(e) => setExtra(i, "notaEbike", e.target.value)} placeholder={ex.nombre} />
              </div>
            </div>
          </div>
        ))}

        {mensaje && <div style={{ marginTop: 4, background: "#E8F7ED", color: "#1E7A38", padding: 11, borderRadius: 6, fontSize: 13.5 }}>{mensaje}</div>}
        {error && <div style={{ marginTop: 4, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 11, borderRadius: 6, fontSize: 13.5 }}>{error}</div>}

        <div style={{ marginTop: 18 }}>
          <button type="button" className="btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PantallaExtras() {
  return (
    <RequiereAdmin>
      <PantallaExtrasContenido />
    </RequiereAdmin>
  );
}
