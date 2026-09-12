"use client";
import { useState } from "react";
import { PRIVACIDAD } from "@/lib/privacidad";

export default function PaginaPrivacidad() {
  const [idioma, setIdioma] = useState("es");
  const t = PRIVACIDAD[idioma];

  return (
    <div className="tema-cliente" style={{ minHeight: "100vh", padding: "28px 16px 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22, color: "var(--text)", letterSpacing: "-0.02em" }}>
              Flow Rentals
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{t.titulo}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["es", "en"].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setIdioma(val)}
                className={idioma === val ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 16px", fontSize: 13 }}
              >
                {val === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: "30px 26px" }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 26, margin: "0 0 6px" }}>{t.titulo}</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" }}>{t.actualizado}</p>
          <p style={{ fontSize: 15, lineHeight: 1.6, margin: "0 0 28px" }}>{t.intro}</p>

          {t.secciones.map((sec, i) => (
            <div key={i} style={{ marginBottom: i < t.secciones.length - 1 ? 24 : 0 }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16.5, margin: "0 0 10px" }}>{sec.titulo}</h2>
              {sec.parrafos.map((p, j) => (
                <p key={j} style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--text)", margin: j < sec.parrafos.length - 1 ? "0 0 10px" : 0 }}>
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
