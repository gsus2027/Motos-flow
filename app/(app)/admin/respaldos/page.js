"use client";
import { useEffect, useState } from "react";

function formatoFecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("es-PA", { dateStyle: "medium", timeStyle: "short" });
}

function formatoTamano(bytes) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function PantallaRespaldos() {
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function cargar() {
    setCargando(true);
    fetch("/api/respaldos")
      .then((r) => r.json())
      .then((d) => {
        setArchivos(d.archivos || []);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function generarAhora() {
    setError("");
    setMensaje("");
    setGenerando(true);
    try {
      const res = await fetch("/api/backup").then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setMensaje("Respaldo generado correctamente.");
      cargar();
    } catch (err) {
      setError(err.message || "No se pudo generar el respaldo.");
    } finally {
      setGenerando(false);
    }
  }

  async function descargar(nombre) {
    setError("");
    try {
      const res = await fetch(`/api/respaldos?descargar=${encodeURIComponent(nombre)}`).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      window.open(res.url, "_blank");
    } catch (err) {
      setError(err.message || "No se pudo generar el link de descarga.");
    }
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, fontWeight: 600, margin: 0 }}>Respaldos</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>
        Se genera uno automáticamente cada día a las 4:00 AM. Se conservan los últimos 5 meses (los más viejos se borran solos).
      </p>

      <div style={{ marginBottom: 20 }}>
        <button type="button" className="btn-primary" onClick={generarAhora} disabled={generando}>
          {generando ? "Generando…" : "Generar respaldo ahora"}
        </button>
      </div>

      {mensaje && (
        <div style={{ marginBottom: 18, background: "#173420", color: "#8FE0AC", padding: 11, borderRadius: 6, fontSize: 13.5, maxWidth: 620 }}>{mensaje}</div>
      )}
      {error && (
        <div style={{ marginBottom: 18, background: "#3A2323", color: "#F3A9A4", padding: 11, borderRadius: 6, fontSize: 13.5, maxWidth: 620 }}>{error}</div>
      )}

      <div className="card" style={{ padding: 0, maxWidth: 620, overflow: "hidden" }}>
        {cargando ? (
          <div style={{ padding: 20, color: "var(--text-muted)" }}>Cargando…</div>
        ) : archivos.length === 0 ? (
          <div style={{ padding: 20, color: "var(--text-muted)" }}>Todavía no hay respaldos guardados.</div>
        ) : (
          archivos.map((a, i) => (
            <div
              key={a.nombre}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ fontSize: 14 }}>{formatoFecha(a.creado)}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatoTamano(a.tamano)}</div>
              </div>
              <button type="button" className="btn-secondary" onClick={() => descargar(a.nombre)}>
                Descargar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
