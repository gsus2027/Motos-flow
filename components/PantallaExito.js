"use client";
import { useState } from "react";
import { RESENAS, RUTA, consejosSeguridad, TEXTOS_EXITO, WHATSAPP_NUMERO } from "@/lib/contenidoExito";

// Colores de la marca (dorado estilo Hertz, igual que la página web)
const ORO = "#F5B800";
const ORO_FONDO = "#FFF6DB";
const ORO_TEXTO = "#6B4A00";

function Encabezado({ titulo, onVolver, textoVolver }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <button
        type="button"
        onClick={onVolver}
        aria-label={textoVolver}
        style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--panel-2)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >
        ←
      </button>
      <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 18, margin: 0 }}>{titulo}</h3>
    </div>
  );
}

function Mosaico({ icono, texto, onClick, href }) {
  const estilo = {
    aspectRatio: "1 / 1", border: "1px solid var(--border)", borderRadius: 18, background: "var(--panel)",
    display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start",
    padding: 16, cursor: "pointer", textDecoration: "none", color: "var(--text)", textAlign: "left",
    font: "inherit", width: "100%",
  };
  const contenido = (
    <>
      <span style={{ width: 44, height: 44, borderRadius: 12, background: ORO_FONDO, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{icono}</span>
      <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25 }}>{texto}</span>
    </>
  );
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={estilo}>{contenido}</a>;
  }
  return <button type="button" onClick={onClick} style={estilo}>{contenido}</button>;
}

// tipo: "moto" | "ebike"
export default function PantallaExito({ idioma, tipo, tituloExito, textoExito, nombreCliente }) {
  const lang = idioma === "en" ? "en" : "es";
  const te = TEXTOS_EXITO[lang];
  const ruta = RUTA[lang];
  const seguridad = consejosSeguridad(tipo, lang);
  const [vista, setVista] = useState("inicio");

  const primerNombre = String(nombreCliente || "").trim().split(/\s+/)[0];
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(te.whatsappMensaje)}`;

  function ir(v) {
    setVista(v);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const volver = () => ir("inicio");

  if (vista === "ruta") {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "0 auto", padding: "20px 18px" }}>
        <Encabezado titulo={te.rutaTitulo} onVolver={volver} textoVolver={te.volver} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ruta.map((p, i) => (
            <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ width: 32, height: 32, borderRadius: "50%", background: ORO_FONDO, color: ORO_TEXTO, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{p.icono} {p.nombre}</div>
                  <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.5 }}>{p.texto}</p>
                  <a href={p.mapsLink} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", fontSize: 13, fontWeight: 600, color: ORO_TEXTO, background: ORO_FONDO, padding: "6px 12px", borderRadius: 20, textDecoration: "none" }}>
                    📍 {te.verMapa}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (vista === "lugares") {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "0 auto", padding: "20px 18px" }}>
        <Encabezado titulo={te.lugaresTitulo} onVolver={volver} textoVolver={te.volver} />
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "0 0 14px" }}>{te.lugaresTexto}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {ruta.map((p, i) => (
            <a key={i} href={p.mapsLink} target="_blank" rel="noopener noreferrer" style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "14px 12px", textDecoration: "none", color: "var(--text)", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 26 }}>{p.icono}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25 }}>{p.nombre}</span>
              <span style={{ fontSize: 12, color: ORO_TEXTO, fontWeight: 600 }}>📍 Maps</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (vista === "seguridad") {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "0 auto", padding: "20px 18px" }}>
        <Encabezado titulo={te.seguridadTitulo} onVolver={volver} textoVolver={te.volver} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {seguridad.map((linea, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", background: "var(--panel-2)", borderRadius: 12 }}>
              <span style={{ color: ORO_TEXTO, fontWeight: 700, flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>{linea}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Inicio ----
  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ textAlign: "center", padding: "8px 0 18px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DCEAE1", color: "#245939", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>✓</div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 21, margin: "0 0 4px" }}>
          {primerNombre ? `${te.listo}, ${primerNombre}!` : tituloExito}
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>{primerNombre ? te.contratoFirmado : textoExito}</p>
      </div>

      {/* Reseñas: lo primero que se ve, siempre visible */}
      <div style={{ background: ORO_FONDO, border: `1px solid ${ORO}`, borderRadius: 18, padding: "18px 16px", marginBottom: 16 }}>
        <div style={{ color: ORO, fontSize: 20, letterSpacing: 2, marginBottom: 6 }}>★★★★★</div>
        <div style={{ fontWeight: 600, fontSize: 16, color: ORO_TEXTO }}>{te.gustoTitulo}</div>
        <div style={{ fontSize: 13.5, color: ORO_TEXTO, opacity: 0.85, margin: "2px 0 14px" }}>{te.gustoTexto}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <a href={RESENAS.google} target="_blank" rel="noopener noreferrer" style={{ background: ORO, color: "#1D1D1F", borderRadius: 12, padding: "12px 8px", textAlign: "center", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Google
          </a>
          <a href={RESENAS.tripadvisor} target="_blank" rel="noopener noreferrer" style={{ background: "#FFFFFF", color: ORO_TEXTO, border: `1.5px solid ${ORO}`, borderRadius: 12, padding: "12px 8px", textAlign: "center", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            TripAdvisor
          </a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <Mosaico icono="🗺️" texto={te.botonRuta} onClick={() => ir("ruta")} />
        <Mosaico icono="📍" texto={te.botonLugares} onClick={() => ir("lugares")} />
        <Mosaico icono="🛡️" texto={te.botonSeguridad} onClick={() => ir("seguridad")} />
        <Mosaico icono="💬" texto={te.botonWhatsapp} href={whatsappLink} />
      </div>
    </div>
  );
}
