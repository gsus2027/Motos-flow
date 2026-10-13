"use client";
import { useState } from "react";

// Aviso "Empezar turno" (13-oct-2026, etapa 3 del cuadre de pagos): tapa el
// panel hasta que quien atiende cuenta el efectivo de la caja. Un
// administrador que solo está revisando (por ejemplo, desde su casa) puede
// saltarlo.

function hora(iso) {
  return iso ? new Date(iso).toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit", timeZone: "America/Panama" }) : "";
}
function dinero(n) {
  return "$" + (Math.round(Number(n || 0) * 100) / 100).toFixed(2);
}

export default function EmpezarTurno({ staffActual, turnoDeOtro, ultimoCerrado, onListo, onNoSoy, onSaltar }) {
  const [contado, setContado] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function empezar() {
    if (String(contado).trim() === "") return setError("Escribe cuánto efectivo hay en la caja (puede ser 0).");
    setGuardando(true);
    setError("");
    const res = await fetch("/api/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "abrir", contado }),
    })
      .then((x) => x.json())
      .catch(() => ({ error: "No se pudo guardar. Revisa tu conexión." }));
    setGuardando(false);
    if (res.error) return setError(res.error);
    onListo(res.turno);
  }

  let explicacion;
  if (turnoDeOtro) {
    explicacion = (
      <>
        <b>{turnoDeOtro.usuario_nombre}</b> tiene un turno abierto desde las {hora(turnoDeOtro.abierto_en)} y no lo cerró. Cuenta el efectivo de la caja: con ese conteo se cierra su turno y empieza el tuyo.
      </>
    );
  } else if (ultimoCerrado) {
    explicacion = (
      <>
        <b>{ultimoCerrado.usuario_nombre}</b> cerró su turno a las {hora(ultimoCerrado.cerrado_en)} y dejó <b>{dinero(ultimoCerrado.efectivo_contado)}</b>. Cuéntalo tú también antes de cobrar: si no coincide, la diferencia queda en su turno, no en el tuyo.
      </>
    );
  } else {
    explicacion = <>Es el primer turno. Escribe con cuánto efectivo empieza la caja.</>;
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="turno-titulo" style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(29,29,31,.72)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "8vh 16px 16px", overflowY: "auto" }}>
      <div className="card" style={{ maxWidth: 440, width: "100%", padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{staffActual.nombre}</div>
          <div id="turno-titulo" style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 700 }}>Empezar turno</div>
        </div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{explicacion}</p>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="turno-contado">¿Cuánto efectivo hay en la caja?</label>
          <input
            id="turno-contado"
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            value={contado}
            onChange={(e) => setContado(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && empezar()}
            style={{ fontSize: 24, fontWeight: 600 }}
          />
        </div>
        {error && <div style={{ color: "var(--danger-text)", fontSize: 13.5 }}>{error}</div>}
        <button type="button" className="btn-primary" onClick={empezar} disabled={guardando} style={{ minHeight: 52 }}>
          {guardando ? "Guardando…" : "Empezar mi turno"}
        </button>
        <button type="button" className="btn-secondary" onClick={onNoSoy} disabled={guardando}>
          No soy {String(staffActual.nombre || "").split(/\s+/)[0]}
        </button>
        {onSaltar && (
          <button type="button" onClick={onSaltar} style={{ border: "none", background: "transparent", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", minHeight: 40 }}>
            Solo estoy revisando, no voy a cobrar
          </button>
        )}
      </div>
    </div>
  );
}
