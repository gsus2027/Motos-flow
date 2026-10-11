"use client";
import { useEffect, useState } from "react";
import RequiereAdmin from "@/components/RequiereAdmin";

function formatoDia(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
function dinero(n) {
  return "$" + Number(n || 0).toFixed(2);
}
const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const OVERLAY = { position: "fixed", inset: 0, background: "rgba(20,18,15,.6)", zIndex: 40, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "26px 16px", overflowY: "auto" };

function Stat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: "14px 18px", flex: "1 1 160px" }}>
      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 600, color: color || "var(--text)", marginTop: 2 }}>{value}</div>
    </div>
  );
}

// Totales de un miembro contando solo los días hasta la fecha de corte
// (el cálculo es por día, así que filtrar días da el monto exacto).
function hastaCorte(m, corte) {
  const dias = m.dias.filter((d) => d.fecha <= corte);
  return {
    ...m,
    dias,
    rentado: r2(dias.reduce((a, d) => a + d.rentado, 0)),
    comision: r2(dias.reduce((a, d) => a + d.comision, 0)),
    bonos: r2(dias.reduce((a, d) => a + d.bono, 0)),
    metasCumplidas: dias.filter((d) => d.llegoMeta).length,
    total: r2(dias.reduce((a, d) => a + d.total, 0)),
  };
}

function DetalleMiembro({ m }) {
  return (
    <div style={{ padding: "4px 0 12px 34px" }}>
      {m.dias.map((d) => (
        <div key={d.fecha} style={{ borderTop: "1px solid var(--border)", padding: "8px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, gap: 8 }}>
            <span>
              {formatoDia(d.fecha)}
              {d.llegoMeta && <span style={{ fontSize: 11, background: "#DCEAE1", color: "#245939", padding: "1px 6px", borderRadius: 6, marginLeft: 6 }}>meta + {dinero(d.bono)}</span>}
            </span>
            <span>{dinero(d.rentado)} → {dinero(d.total)}</span>
          </div>
          {d.rentas.map((r) => (
            <div key={`${r.tipo}-${r.id}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text-muted)", padding: "2px 0", gap: 8 }}>
              <span>{r.cliente} · {r.vehiculo}</span>
              <span>{dinero(r.monto)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TablaMiembros({ miembros, abierto, setAbierto, mostrarRanking = true }) {
  if (miembros.length === 0) {
    return <div style={{ padding: "14px 0", color: "var(--text-muted)", fontSize: 14 }}>No hay comisiones en este periodo.</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 560 }}>
        <thead>
          <tr style={{ color: "var(--text-muted)", fontSize: 12.5, textAlign: "left" }}>
            <th style={{ padding: "8px 6px", fontWeight: 500, width: 34 }}>{mostrarRanking ? "#" : ""}</th>
            <th style={{ padding: "8px 6px", fontWeight: 500 }}>Miembro</th>
            <th style={{ padding: "8px 6px", fontWeight: 500 }}>Rentado</th>
            <th style={{ padding: "8px 6px", fontWeight: 500 }}>Comisión</th>
            <th style={{ padding: "8px 6px", fontWeight: 500 }}>Metas</th>
            <th style={{ padding: "8px 6px", fontWeight: 500 }}>Total</th>
            <th style={{ padding: "8px 6px" }} />
          </tr>
        </thead>
        <tbody>
          {miembros.map((m, i) => (
            <FilaMiembro key={m.staffId} m={m} i={i} abierto={abierto === m.staffId} onToggle={() => setAbierto(abierto === m.staffId ? null : m.staffId)} mostrarRanking={mostrarRanking} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilaMiembro({ m, i, abierto, onToggle, mostrarRanking }) {
  return (
    <>
      <tr style={{ borderTop: "1px solid var(--border)" }}>
        <td style={{ padding: "10px 6px" }}>{mostrarRanking ? (i === 0 ? "🏆" : i + 1) : ""}</td>
        <td style={{ padding: "10px 6px", fontWeight: 600 }}>{m.nombre}</td>
        <td style={{ padding: "10px 6px" }}>{dinero(m.rentado)}</td>
        <td style={{ padding: "10px 6px" }}>{dinero(m.comision)}</td>
        <td style={{ padding: "10px 6px" }}>{m.metasCumplidas > 0 ? `${m.metasCumplidas} · ${dinero(m.bonos)}` : "—"}</td>
        <td style={{ padding: "10px 6px", fontWeight: 600 }}>{dinero(m.total)}</td>
        <td style={{ padding: "10px 6px", textAlign: "right" }}>
          <button className="btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={onToggle}>
            {abierto ? "Ocultar" : "Ver detalle"}
          </button>
        </td>
      </tr>
      {abierto && (
        <tr>
          <td colSpan={7}><DetalleMiembro m={m} /></td>
        </tr>
      )}
    </>
  );
}

function ComisionesContenido() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(null);
  const [cfg, setCfg] = useState({ tasa: "", metaDiaria: "", bono: "" });
  const [cfgMsg, setCfgMsg] = useState("");
  const [cerrando, setCerrando] = useState(null); // { corte, error, guardando }
  const [periodoAbierto, setPeriodoAbierto] = useState(null);
  const [miembroHist, setMiembroHist] = useState(null);

  async function cargar() {
    const d = await fetch("/api/comisiones?vista=admin").then((r) => r.json()).catch(() => ({ error: "No se pudo cargar. Revisa tu conexión." }));
    if (d.error) {
      setError(d.error);
      return;
    }
    setError("");
    setDatos(d);
    setCfg({ tasa: String(d.configCompleta.tasa), metaDiaria: String(d.configCompleta.metaDiaria), bono: String(d.configCompleta.bono) });
  }
  useEffect(() => { cargar(); }, []);

  async function guardarConfig() {
    setCfgMsg("");
    const res = await fetch("/api/comisiones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "config", tasa: Number(cfg.tasa), metaDiaria: Number(cfg.metaDiaria), bono: Number(cfg.bono) }),
    }).then((r) => r.json()).catch(() => ({ error: "No se pudo guardar." }));
    if (res.error) return setCfgMsg(res.error);
    setCfgMsg("Guardado ✓");
    cargar();
  }

  async function cambiarComisiona(s, valor) {
    const res = await fetch("/api/comisiones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "comisiona", staffId: s.id, comisiona: valor }),
    }).then((r) => r.json()).catch(() => ({ error: "No se pudo guardar." }));
    if (res.error) return setError(res.error);
    cargar();
  }

  async function confirmarCierre() {
    setCerrando((c) => ({ ...c, guardando: true, error: "" }));
    const res = await fetch("/api/comisiones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "cerrar", fechaCorte: cerrando.corte }),
    }).then((r) => r.json()).catch(() => ({ error: "No se pudo cerrar. Revisa tu conexión." }));
    if (res.error) {
      setCerrando((c) => ({ ...c, guardando: false, error: res.error }));
      return;
    }
    setCerrando(null);
    setAbierto(null);
    cargar();
  }

  if (error && !datos) return <div className="card" style={{ padding: 24, color: "var(--danger)" }}>{error}</div>;
  if (!datos) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;

  const { equipo, periodo, staff, historial, hoy } = datos;
  const previa = cerrando
    ? equipo.miembros.map((m) => hastaCorte(m, cerrando.corte)).filter((m) => m.dias.length > 0)
    : [];
  const totalPrevia = r2(previa.reduce((a, m) => a + m.total, 0));

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Comisiones</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 22px" }}>
        Periodo abierto: {formatoDia(periodo.inicio)} – hoy. Cada renta cuenta el día de entrega, por su total cobrado.
      </p>

      {error && <div style={{ marginBottom: 14, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 10, borderRadius: 6, fontSize: 13 }}>{error}</div>}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <Stat label="Rentado por el equipo" value={dinero(equipo.rentado)} />
        <Stat label="Comisiones por pagar" value={dinero(equipo.total)} color="#8A5A03" />
        <Stat label="Sin comisión (web u otros)" value={dinero(equipo.sinComision)} />
      </div>

      <div className="card" style={{ padding: "16px 20px", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, margin: 0 }}>Periodo actual</h2>
          <button className="btn-primary" disabled={equipo.miembros.length === 0} onClick={() => setCerrando({ corte: hoy, error: "", guardando: false })}>
            💵 Pagar y cerrar periodo
          </button>
        </div>
        <TablaMiembros miembros={equipo.miembros} abierto={abierto} setAbierto={setAbierto} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 22 }}>
        <div className="card" style={{ padding: "16px 20px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16, margin: "0 0 12px" }}>Reglas</h2>
          {[
            ["tasa", "Comisión (%)", "15 = ÷20×3"],
            ["metaDiaria", "Meta diaria ($ rentados)", "0 = sin meta"],
            ["bono", "Bono por meta cumplida ($)", ""],
          ].map(([k, label, ayuda]) => (
            <div key={k} className="field" style={{ marginBottom: 10 }}>
              <label>{label}</label>
              <input type="number" min="0" step="0.01" inputMode="decimal" value={cfg[k]} onChange={(e) => { setCfg((c) => ({ ...c, [k]: e.target.value })); setCfgMsg(""); }} />
              {ayuda && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{ayuda}</div>}
            </div>
          ))}
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            Los cambios aplican al periodo abierto. Los periodos ya pagados no cambian.
          </div>
          <button className="btn-secondary" onClick={guardarConfig}>Guardar reglas</button>
          {cfgMsg && <span style={{ marginLeft: 10, fontSize: 13, color: cfgMsg.includes("✓") ? "#245939" : "var(--danger)" }}>{cfgMsg}</span>}
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16, margin: "0 0 4px" }}>Quién cobra comisión</h2>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 10px" }}>Desactívalo para cuentas como &quot;Reg. Website&quot;.</p>
          {staff.filter((s) => s.activo !== false).map((s) => (
            <label key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 14, cursor: "pointer" }}>
              <span>{s.nombre}</span>
              <input type="checkbox" checked={s.comisiona} onChange={(e) => cambiarComisiona(s, e.target.checked)} />
            </label>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: "16px 20px" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, margin: "0 0 8px" }}>Historial de periodos pagados</h2>
        {historial.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "6px 0" }}>Todavía no se ha pagado ningún periodo.</div>
        ) : (
          historial.map((p) => (
            <div key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => { setPeriodoAbierto(periodoAbierto === p.id ? null : p.id); setMiembroHist(null); }}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--text)", textAlign: "left", flexWrap: "wrap" }}
              >
                <span style={{ fontWeight: 600 }}>{formatoDia(p.inicio)} – {formatoDia(p.fin)}</span>
                <span style={{ color: "var(--text-muted)" }}>
                  {dinero(p.total)} · pagado {formatoDia(p.pagado_en)}{p.pagado_por ? ` por ${p.pagado_por}` : ""} {periodoAbierto === p.id ? "▲" : "▼"}
                </span>
              </button>
              {periodoAbierto === p.id && (
                <div style={{ paddingBottom: 10 }}>
                  <TablaMiembros miembros={p.detalle || []} abierto={miembroHist} setAbierto={setMiembroHist} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {cerrando && (
        <div style={OVERLAY}>
          <div className="card" style={{ padding: 24, maxWidth: 460, width: "100%", background: "var(--bg)" }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Pagar y cerrar periodo</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 16px" }}>
              Se pagan las rentas con entrega desde {formatoDia(periodo.inicio)} hasta la fecha de corte. El periodo siguiente empieza en cero.
            </p>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Fecha de corte</label>
              <input type="date" value={cerrando.corte} max={hoy} min={periodo.inicio} onChange={(e) => e.target.value && setCerrando((c) => ({ ...c, corte: e.target.value, error: "" }))} />
            </div>
            <div style={{ background: "var(--panel-2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              {previa.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No hay comisiones hasta esa fecha.</div>
              ) : (
                <>
                  {previa.map((m) => (
                    <div key={m.staffId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "3px 0" }}>
                      <span>{m.nombre}</span><span>{dinero(m.total)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                    <span>Total a pagar</span><span>{dinero(totalPrevia)}</span>
                  </div>
                </>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--warning-text)", background: "var(--warning-bg)", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
              Esto no se puede deshacer. Haz el pago al equipo y luego confirma aquí.
            </div>
            {cerrando.error && (
              <div style={{ marginBottom: 14, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 10, borderRadius: 6, fontSize: 13 }}>{cerrando.error}</div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" onClick={() => setCerrando(null)}>Cancelar</button>
              <button className="btn-primary" disabled={cerrando.guardando || previa.length === 0} onClick={confirmarCierre}>
                {cerrando.guardando ? "Guardando…" : `Confirmar pago de ${dinero(totalPrevia)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PantallaComisiones() {
  return (
    <RequiereAdmin>
      <ComisionesContenido />
    </RequiereAdmin>
  );
}
