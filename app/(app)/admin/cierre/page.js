"use client";
import { useEffect, useState } from "react";
import { useStaffActual } from "@/lib/staffContext";
import { estadoCobro, claveRenta, METODOS_COBRO, METODO_COBRO_LABELS, metodoPideAutorizacion, normalizarAutorizacion, limpiarAutorizacion } from "@/lib/cobros";

// Cierre del día (cuadre de pagos, 13-oct-2026): lo que se cobró en un día,
// separado por método, para comparar contra el datáfono (tarjeta), las
// capturas de Yappy y el efectivo en caja. Cualquiera del equipo puede
// verlo y corregir el método de un cobro del día; días anteriores solo un
// administrador (lo valida /api/cobros).

function hoyPanama() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Panama" }).format(new Date());
}
function dinero(n) {
  return "$" + (Math.round(Number(n || 0) * 100) / 100).toFixed(2);
}
function hora(iso) {
  return new Date(iso).toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit", timeZone: "America/Panama" });
}

function Tarjeta({ label, monto, sub, resaltar }) {
  return (
    <div className="card" style={{ padding: "16px 20px", minWidth: 150, flex: "1 1 150px", borderColor: resaltar ? "var(--warning-text)" : undefined }}>
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 600, marginTop: 2 }}>{monto}</div>
      <div style={{ fontSize: 12.5, color: resaltar ? "var(--warning-text)" : "var(--text-muted)" }}>{sub}</div>
    </div>
  );
}

export default function CierreDia() {
  const { staffActual } = useStaffActual();
  const [fecha, setFecha] = useState(hoyPanama());
  const [cobros, setCobros] = useState([]);
  const [porCobrar, setPorCobrar] = useState({ monto: 0, rentas: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [corrigiendo, setCorrigiendo] = useState(null); // { cobro, metodo, autorizacion, error, guardando }

  async function cargar(dia = fecha) {
    setCargando(true);
    setError("");
    const [rc, ra, rr, rre] = await Promise.all([
      fetch(`/api/cobros?fecha=${dia}`).then((r) => r.json()).catch(() => ({ error: "No se pudo cargar." })),
      fetch("/api/cobros").then((r) => r.json()).catch(() => ({})),
      fetch("/api/rentas").then((r) => r.json()).catch(() => ({})),
      fetch("/api/rentas-ebike").then((r) => r.json()).catch(() => ({})),
    ]);
    if (rc.error) {
      setError(
        rc.error.includes("cobros")
          ? "Todavía no existe la tabla de cobros. Hay que correr supabase-schema-cobros.sql en Supabase."
          : rc.error
      );
      setCobros([]);
    } else {
      setCobros(rc.cobros || []);
    }
    const agrupados = {};
    for (const c of ra.cobros || []) (agrupados[claveRenta(c.renta_tipo, c.renta_id)] ||= []).push(c);
    const activas = [
      ...(rr.rentas || []).map((r) => ({ ...r, _tipo: "moto" })),
      ...(rre.rentas || []).map((r) => ({ ...r, _tipo: "ebike" })),
    ].filter((r) => r.estado !== "devuelta");
    let monto = 0;
    let rentas = 0;
    for (const r of activas) {
      const { pendiente } = estadoCobro(r, agrupados[claveRenta(r._tipo, r.id)]);
      if (pendiente > 0) {
        monto += pendiente;
        rentas += 1;
      }
    }
    setPorCobrar({ monto: Math.round(monto * 100) / 100, rentas });
    setCargando(false);
  }

  useEffect(() => {
    cargar(fecha);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  const totales = Object.fromEntries(METODOS_COBRO.map((m) => [m, { monto: 0, cantidad: 0, sinAut: 0 }]));
  for (const c of cobros) {
    const t = totales[c.metodo];
    if (!t) continue;
    t.monto += Number(c.monto || 0);
    t.cantidad += 1;
    if (metodoPideAutorizacion(c.metodo) && !c.autorizacion_ult4) t.sinAut += 1;
  }
  const totalDia = cobros.reduce((s, c) => s + Number(c.monto || 0), 0);

  async function guardarCorreccion() {
    const { cobro, metodo, autorizacion } = corrigiendo;
    if (metodoPideAutorizacion(metodo) && !normalizarAutorizacion(autorizacion) && !(metodo === cobro.metodo && cobro.autorizacion_ult4)) {
      setCorrigiendo((c) => ({ ...c, error: "Escribe los últimos 4 números o letras." }));
      return;
    }
    setCorrigiendo((c) => ({ ...c, guardando: true, error: "" }));
    const res = await fetch("/api/cobros", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cobro.id, metodo, autorizacion }),
    })
      .then((x) => x.json())
      .catch(() => ({ error: "No se pudo guardar. Revisa tu conexión." }));
    if (res.error) {
      setCorrigiendo((c) => ({ ...c, guardando: false, error: res.error }));
      return;
    }
    setCorrigiendo(null);
    cargar();
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Cierre del día</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 18px" }}>
        Lo que se cobró, por método. Compáralo con el cierre de lote del datáfono, las capturas de Yappy y el efectivo en caja.
      </p>

      <div className="card" style={{ padding: "12px 16px", marginBottom: 18, background: "var(--highlight-bg)", borderColor: "var(--highlight-border)", fontSize: 14 }}>
        La caja de Isla Colón es una sola para Flow Rentals y Multicargas: los turnos (contar el efectivo) y el cuadre con fotos se hacen en{" "}
        {process.env.NEXT_PUBLIC_MULTICARGAS_URL ? (
          <a href={`${process.env.NEXT_PUBLIC_MULTICARGAS_URL.replace(/\/$/, "")}/cuadre`} target="_blank" rel="noreferrer">Multicargas</a>
        ) : (
          "Multicargas"
        )}
        , y ahí ya se suman los cobros de Flow.
      </div>

      <div className="field" style={{ maxWidth: 220, marginBottom: 20 }}>
        <label htmlFor="cierre-fecha">Día</label>
        <input id="cierre-fecha" type="date" value={fecha} max={hoyPanama()} onChange={(e) => setFecha(e.target.value)} />
      </div>

      {error && (
        <div className="card" style={{ padding: 16, marginBottom: 16, color: "var(--danger-text)", background: "var(--danger-bg)" }}>{error}</div>
      )}

      {cargando ? (
        <div style={{ color: "var(--text-muted)" }}>Cargando…</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            {METODOS_COBRO.map((m) => (
              <Tarjeta
                key={m}
                label={METODO_COBRO_LABELS[m]}
                monto={dinero(totales[m].monto)}
                sub={`${totales[m].cantidad} ${totales[m].cantidad === 1 ? "cobro" : "cobros"}${totales[m].sinAut ? ` · ${totales[m].sinAut} sin autorización` : ""}`}
                resaltar={totales[m].sinAut > 0}
              />
            ))}
            <Tarjeta label="Total del día" monto={dinero(totalDia)} sub={`${cobros.length} ${cobros.length === 1 ? "cobro" : "cobros"}`} />
          </div>

          {fecha === hoyPanama() && porCobrar.monto > 0 && (
            <div className="card" style={{ padding: "12px 16px", marginBottom: 18, background: "var(--warning-bg)", borderColor: "transparent", color: "var(--warning-text)", fontSize: 14 }}>
              <strong>Por cobrar: {dinero(porCobrar.monto)}</strong> en {porCobrar.rentas} {porCobrar.rentas === 1 ? "renta activa" : "rentas activas"}. Se cobran desde el Panel.
            </div>
          )}

          {cobros.length === 0 ? (
            <div className="card" style={{ padding: 24, color: "var(--text-muted)", fontSize: 14.5 }}>No hay cobros registrados en este día.</div>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 12.5 }}>
                    {["Hora", "Cliente", "Vehículo", "Método", "Autorización", "Cobró", "Monto", ""].map((h) => (
                      <th key={h} style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cobros.map((c) => (
                    <tr key={c.id}>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>{hora(c.creado_en)}</td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>{c.renta?.cliente || "—"}</td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>{c.renta?.vehiculo || "—"}</td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                        {METODO_COBRO_LABELS[c.metodo] || c.metodo}
                        {c.corregido_por_nombre && (
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>corregido por {c.corregido_por_nombre}</div>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontVariantNumeric: "tabular-nums" }}>
                        {c.autorizacion_ult4 ? `···${c.autorizacion_ult4}` : metodoPideAutorizacion(c.metodo) ? <span style={{ color: "var(--warning-text)", fontWeight: 600 }}>Falta</span> : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>{c.cobrado_por_nombre || "—"}</td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>{dinero(c.monto)}</td>
                      <td style={{ padding: "6px 14px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                        {(fecha === hoyPanama() || staffActual?.es_admin) && (
                          <button
                            className="btn-secondary"
                            style={{ padding: "8px 14px", fontSize: 13.5 }}
                            onClick={() => setCorrigiendo({ cobro: c, metodo: c.metodo, autorizacion: "", error: "", guardando: false })}
                          >
                            Corregir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {corrigiendo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,15,.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "26px 16px" }} role="dialog" aria-modal="true" aria-labelledby="corregir-titulo">
          <div className="card" style={{ padding: 24, maxWidth: 420, width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div id="corregir-titulo" style={{ fontWeight: 600, fontSize: 17 }}>Corregir método</div>
              <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
                {corrigiendo.cobro.renta?.cliente} · {dinero(corrigiendo.cobro.monto)} · ahora: {METODO_COBRO_LABELS[corrigiendo.cobro.metodo]}
              </div>
            </div>
            <div role="radiogroup" aria-label="Método correcto" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {METODOS_COBRO.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={corrigiendo.metodo === m}
                  onClick={() => setCorrigiendo((c) => ({ ...c, metodo: m, error: "" }))}
                  style={{
                    height: 52,
                    borderRadius: 12,
                    border: corrigiendo.metodo === m ? "2px solid var(--amber)" : "1px solid var(--border)",
                    background: corrigiendo.metodo === m ? "var(--highlight-bg)" : "var(--panel)",
                    color: corrigiendo.metodo === m ? "var(--highlight-text)" : "var(--text)",
                    fontWeight: corrigiendo.metodo === m ? 600 : 500,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  {METODO_COBRO_LABELS[m]}
                </button>
              ))}
            </div>
            {metodoPideAutorizacion(corrigiendo.metodo) && (
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="corregir-aut">Últimos 4 {corrigiendo.metodo === "yappy" ? "de la confirmación de Yappy" : "de la autorización"} (números o letras)</label>
                <input
                  id="corregir-aut"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={12}
                  placeholder={corrigiendo.metodo === corrigiendo.cobro.metodo && corrigiendo.cobro.autorizacion_ult4 ? corrigiendo.cobro.autorizacion_ult4 : "0000"}
                  value={corrigiendo.autorizacion}
                  onChange={(e) => setCorrigiendo((c) => ({ ...c, autorizacion: limpiarAutorizacion(e.target.value) }))}
                  style={{ width: 170, fontSize: 22, letterSpacing: "0.3em" }}
                />
              </div>
            )}
            {corrigiendo.error && <div style={{ color: "var(--danger)", fontSize: 13.5 }}>{corrigiendo.error}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" onClick={() => setCorrigiendo(null)} disabled={corrigiendo.guardando}>Cancelar</button>
              <button className="btn-primary" onClick={guardarCorreccion} disabled={corrigiendo.guardando}>
                {corrigiendo.guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
