"use client";
import { useState } from "react";
import { METODOS_COBRO, METODO_COBRO_LABELS, metodoPideAutorizacion, normalizarAutorizacion, limpiarAutorizacion } from "@/lib/cobros";

// Cuadre de pagos (13-oct-2026): ventana "Cobrar" del Panel. El monto ya
// viene lleno con lo que falta; tres botones grandes para el método; los 4
// dígitos de autorización solo aparecen con Tarjeta o Yappy. El botón dice
// el nombre de quien está con la sesión abierta, para que se note si es la
// sesión de otro compañero.

const OVERLAY = { position: "fixed", inset: 0, background: "rgba(20,18,15,.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "26px 16px", overflowY: "auto" };

function Icono({ metodo }) {
  const comun = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, "aria-hidden": true };
  if (metodo === "efectivo") return <svg {...comun}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>;
  if (metodo === "tarjeta") return <svg {...comun}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
  return <svg {...comun}><rect x="6" y="2" width="12" height="20" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>;
}

function dinero(n) {
  return "$" + (Math.round(Number(n || 0) * 100) / 100).toFixed(2);
}

/**
 * @param {object} props
 * @param {object} props.renta - con _tipo, id, cliente, _vehiculo.
 * @param {number} props.pendiente - lo que falta por cobrar.
 * @param {string} [props.nombreStaff] - quien tiene la sesión abierta.
 * @param {string} [props.aviso] - texto opcional arriba (ej. "Antes de devolverla…").
 * @param {() => void} props.onCerrar
 * @param {(cobro) => void} props.onCobrado
 * @param {{ texto: string, onClick: () => void }} [props.accionSecundaria] - ej. "Devolver sin cobrar".
 */
export default function CobroModal({ renta, pendiente, nombreStaff, aviso, onCerrar, onCobrado, accionSecundaria }) {
  const [monto, setMonto] = useState(pendiente > 0 ? Number(pendiente).toFixed(2) : "");
  const [metodo, setMetodo] = useState("");
  const [autorizacion, setAutorizacion] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const montoNum = Math.round(Number(String(monto).replace(/[$,\s]/g, "")) * 100) / 100;
  const pideAut = metodoPideAutorizacion(metodo);

  async function confirmar() {
    if (!metodo) return setError("Elige cómo pagó.");
    if (!(montoNum > 0)) return setError("Escribe el monto que recibiste.");
    if (pideAut && !normalizarAutorizacion(autorizacion)) {
      return setError(metodo === "yappy" ? "Escribe los últimos 4 de la confirmación de Yappy." : "Escribe los últimos 4 del número de autorización del recibo.");
    }
    setGuardando(true);
    setError("");
    const res = await fetch("/api/cobros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rentaTipo: renta._tipo, rentaId: renta.id, monto: montoNum, metodo, autorizacion }),
    })
      .then((x) => x.json())
      .catch(() => ({ error: "No se pudo guardar. Revisa tu conexión." }));
    if (res.error) {
      setGuardando(false);
      setError(res.error);
      return;
    }
    onCobrado(res.cobro);
  }

  return (
    <div style={OVERLAY} role="dialog" aria-modal="true" aria-labelledby="cobro-titulo">
      <div className="card" style={{ padding: 24, maxWidth: 440, width: "100%", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div id="cobro-titulo" style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 21 }}>Cobrar</div>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
            {renta.cliente} — {renta._vehiculo}
          </div>
        </div>

        {aviso && (
          <div style={{ background: "var(--warning-bg)", color: "var(--warning-text)", borderRadius: 8, padding: "10px 12px", fontSize: 13.5 }}>{aviso}</div>
        )}

        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="cobro-monto">Monto que recibes</label>
          <input
            id="cobro-monto"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 600, padding: "8px 12px" }}
          />
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Falta {dinero(pendiente)}. Solo cámbialo si paga una parte.
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }} id="cobro-metodo-titulo">¿Cómo pagó?</div>
          <div role="radiogroup" aria-labelledby="cobro-metodo-titulo" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            {METODOS_COBRO.map((m) => {
              const activo = metodo === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => {
                    setMetodo(m);
                    setError("");
                  }}
                  style={{
                    height: 72,
                    borderRadius: 12,
                    border: activo ? "2px solid var(--amber)" : "1px solid var(--border)",
                    background: activo ? "var(--highlight-bg)" : "var(--panel)",
                    color: activo ? "var(--highlight-text)" : "var(--text)",
                    fontSize: 15,
                    fontWeight: activo ? 600 : 500,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    cursor: "pointer",
                  }}
                >
                  <Icono metodo={m} />
                  {METODO_COBRO_LABELS[m]}
                </button>
              );
            })}
          </div>
        </div>

        {pideAut && (
          <div style={{ background: "var(--highlight-bg)", border: "1px solid var(--highlight-border)", borderRadius: 12, padding: "14px 16px" }}>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="cobro-aut">
                {metodo === "yappy" ? "Últimos 4 de la confirmación de Yappy" : "Últimos 4 de la autorización"}
              </label>
              <input
                id="cobro-aut"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={12}
                placeholder="A7K2"
                value={autorizacion}
                onChange={(e) => setAutorizacion(limpiarAutorizacion(e.target.value))}
                style={{ width: 170, fontSize: 24, letterSpacing: "0.35em", fontVariantNumeric: "tabular-nums" }}
              />
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                {metodo === "yappy" ? "En la captura de Yappy, número de confirmación." : 'En el recibo BAC, línea "AUTO.:" — números o letras.'}
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ color: "var(--danger)", fontSize: 13.5 }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" className="btn-primary" onClick={confirmar} disabled={guardando} style={{ minHeight: 52 }}>
            {guardando ? "Guardando…" : `Confirmar cobro de ${dinero(montoNum || 0)}${nombreStaff ? ` como ${nombreStaff}` : ""}`}
          </button>
          {accionSecundaria && (
            <button type="button" className="btn-secondary" onClick={accionSecundaria.onClick} disabled={guardando}>
              {accionSecundaria.texto}
            </button>
          )}
          <button type="button" onClick={onCerrar} disabled={guardando} style={{ height: 44, border: "none", background: "transparent", color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
