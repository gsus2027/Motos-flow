"use client";

// Lo que se ve en lugar de una lista vacía mientras carga o si no cargó.
export default function AvisoCarga({ cargando, error, intento, onReintentar, idioma = "es", que }) {
  const en = idioma === "en";
  if (error) {
    return (
      <div style={{ background: "var(--warning-bg)", color: "var(--warning-text)", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, marginTop: 6 }}>
        {en ? `Couldn't load the ${que || "list"}. Check your connection.` : `No se pudo cargar la lista${que ? ` de ${que}` : ""}. Revisa tu conexión.`}
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn-secondary" style={{ fontSize: 13, padding: "5px 12px" }} onClick={onReintentar}>
            {en ? "Try again" : "Reintentar"}
          </button>
          <span style={{ fontSize: 12 }}>{en ? "Your answers stay as they are." : "Lo que ya escribiste no se borra."}</span>
        </div>
      </div>
    );
  }
  if (cargando) {
    return (
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
        {en ? "Loading…" : "Cargando…"}
        {intento > 1 ? (en ? ` retrying (${intento} of 4)` : ` reintentando (${intento} de 4)`) : ""}
      </div>
    );
  }
  return null;
}
