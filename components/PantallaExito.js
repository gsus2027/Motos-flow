"use client";
import { RESENAS, RUTA, consejosSeguridad, TEXTOS_EXITO } from "@/lib/contenidoExito";

// tipo: "moto" | "ebike"
export default function PantallaExito({ idioma, tipo, tituloExito, textoExito, otraRentaLabel, onOtraRenta }) {
  const lang = idioma === "en" ? "en" : "es";
  const te = TEXTOS_EXITO[lang];
  const ruta = RUTA[lang];
  const seguridad = consejosSeguridad(tipo, lang);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="card" style={{ padding: "36px 28px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 20, margin: "0 0 10px" }}>{tituloExito}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: 0 }}>{textoExito}</p>
      </div>

      <div className="card" style={{ padding: "24px 22px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, margin: "0 0 6px" }}>{te.resenaTitulo}</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px" }}>{te.resenaTexto}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <a href={RESENAS.google} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            {te.resenaGoogle}
          </a>
          <a href={RESENAS.tripadvisor} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            {te.resenaTripadvisor}
          </a>
        </div>
      </div>

      <div className="card" style={{ padding: "24px 22px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, margin: "0 0 14px" }}>{te.seguridadTitulo}</h3>
        <ul style={{ margin: 0, padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {seguridad.map((linea, i) => (
            <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: "var(--text)" }}>{linea}</li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ padding: "24px 22px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, margin: "0 0 16px" }}>{te.rutaTitulo}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ruta.map((parada, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingBottom: i < ruta.length - 1 ? 16 : 0, borderBottom: i < ruta.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ fontSize: 30, lineHeight: 1, flexShrink: 0, width: 40, textAlign: "center" }}>{parada.icono}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>{i + 1}. {parada.nombre}</div>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "0 0 8px", lineHeight: 1.5 }}>{parada.texto}</p>
                <a href={parada.mapsLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--amber)", textDecoration: "none", fontWeight: 600 }}>
                  📍 {te.verMapa}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <button type="button" className="btn-secondary" onClick={onOtraRenta}>
          {otraRentaLabel}
        </button>
      </div>
    </div>
  );
}
