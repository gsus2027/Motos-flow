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
const FORMAS = [["efectivo", "Efectivo"], ["yappy", "Yappy"], ["transferencia", "Transferencia"], ["otro", "Otro"]];
const nombreForma = (f) => (FORMAS.find(([k]) => k === f) || [null, f || "—"])[1];
const TAG = { fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 6, marginLeft: 6 };
const TH = { padding: "8px 6px", fontWeight: 500 };
const TD = { padding: "10px 6px" };

function Stat({ label, value, color, fondo }) {
  return (
    <div className="card" style={{ padding: "14px 18px", flex: "1 1 150px", background: fondo }}>
      <div style={{ fontSize: 12.5, color: color || "var(--text-muted)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 600, color: color || "var(--text)", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function EstadoDia({ d }) {
  if (d.pendiente <= 0) return <span style={{ ...TAG, background: "#DCEAE1", color: "#245939" }}>pagado</span>;
  if (d.pagado > 0) return <span style={{ ...TAG, background: "#FAEEDA", color: "#854F0B" }}>falta {dinero(d.pendiente)}</span>;
  return null;
}

// Detalle de un miembro: sus días (con lo que ya está pagado) y sus pagos.
function DetalleMiembro({ m, pagos }) {
  const suyos = pagos.filter((p) => p.staff_id === m.staffId);
  return (
    <div style={{ padding: "4px 0 12px 34px" }}>
      {m.dias.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "6px 0" }}>Sin rentas con comisión.</div>}
      {m.dias.map((d) => (
        <div key={d.fecha} style={{ borderTop: "1px solid var(--border)", padding: "8px 0", opacity: d.pendiente <= 0 ? 0.6 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, gap: 8 }}>
            <span>
              {formatoDia(d.fecha)}
              {d.llegoMeta && <span style={{ ...TAG, background: "#DCEAE1", color: "#245939" }}>meta + {dinero(d.bono)}</span>}
              <EstadoDia d={d} />
            </span>
            <span>{dinero(d.rentado)} → {dinero(d.total)}</span>
          </div>
          {(d.rentas || []).map((r) => (
            <div key={`${r.tipo}-${r.id}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text-muted)", padding: "2px 0", gap: 8 }}>
              <span>{r.cliente} · {r.vehiculo}</span>
              <span>{dinero(r.monto)}</span>
            </div>
          ))}
        </div>
      ))}
      {suyos.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 4 }}>Pagos a {m.nombre}</div>
          {suyos.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0", gap: 8, textDecoration: p.anulado ? "line-through" : "none", color: p.anulado ? "var(--text-muted)" : "inherit" }}>
              <span>{formatoDia(p.fecha)} · {nombreForma(p.forma)}{p.nota ? ` · ${p.nota}` : ""}</span>
              <span>{dinero(p.monto)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TablaSaldos({ miembros, pagos, abierto, setAbierto, onPagar }) {
  if (miembros.length === 0) {
    return <div style={{ padding: "14px 0", color: "var(--text-muted)", fontSize: 14 }}>Todavía no hay comisiones.</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 640 }}>
        <thead>
          <tr style={{ color: "var(--text-muted)", fontSize: 12.5, textAlign: "left" }}>
            <th style={{ ...TH, width: 34 }}>#</th>
            <th style={TH}>Miembro</th>
            <th style={TH}>Rentado</th>
            <th style={TH}>Ganado</th>
            <th style={TH}>Pagado</th>
            <th style={TH}>Por pagar</th>
            <th style={TH} />
          </tr>
        </thead>
        <tbody>
          {miembros.map((m, i) => (
            <FilaSaldo key={m.staffId} m={m} i={i} pagos={pagos} abierto={abierto === m.staffId} onToggle={() => setAbierto(abierto === m.staffId ? null : m.staffId)} onPagar={() => onPagar(m)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilaSaldo({ m, i, pagos, abierto, onToggle, onPagar }) {
  return (
    <>
      <tr style={{ borderTop: "1px solid var(--border)" }}>
        <td style={TD}>{i === 0 && m.ganado > 0 ? "🏆" : i + 1}</td>
        <td style={{ ...TD, fontWeight: 600 }}>{m.nombre}</td>
        <td style={TD}>{dinero(m.rentado)}</td>
        <td style={TD}>
          {dinero(m.ganado)}
          {m.metasCumplidas > 0 && <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{m.metasCumplidas} metas · {dinero(m.bonos)}</div>}
        </td>
        <td style={TD}>{dinero(m.pagado)}</td>
        <td style={{ ...TD, fontWeight: 600, color: m.saldo > 0 ? "#8A5A03" : m.saldo < 0 ? "var(--danger)" : "var(--text-muted)" }}>
          {dinero(m.saldo)}
          {m.saldo < 0 && <div style={{ fontSize: 11.5, fontWeight: 400 }}>pagado de más</div>}
        </td>
        <td style={{ ...TD, textAlign: "right", whiteSpace: "nowrap" }}>
          <button className="btn-primary" style={{ fontSize: 12.5, padding: "5px 12px", marginRight: 6 }} disabled={m.saldo <= 0} onClick={onPagar}>
            Pagar
          </button>
          <button className="btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={onToggle}>
            {abierto ? "Ocultar" : "Ver detalle"}
          </button>
        </td>
      </tr>
      {abierto && (
        <tr>
          <td colSpan={7}><DetalleMiembro m={m} pagos={pagos} /></td>
        </tr>
      )}
    </>
  );
}

function VentanaPago({ pago, setPago, onConfirmar }) {
  const { miembro } = pago;
  const monto = r2(pago.monto);
  const valido = Number.isFinite(monto) && monto > 0 && monto <= miembro.saldo;
  const queda = r2(miembro.saldo - (Number.isFinite(monto) ? monto : 0));
  const cambiar = (k, v) => setPago((p) => ({ ...p, [k]: v, error: "" }));
  const atajos = [50, 100].filter((n) => n < miembro.saldo);

  function enviar() {
    if (!(Number.isFinite(monto) && monto > 0)) return setPago((p) => ({ ...p, error: "Escribe un monto mayor que $0." }));
    if (monto > miembro.saldo) return setPago((p) => ({ ...p, error: `No puede pasar de ${dinero(miembro.saldo)}.` }));
    onConfirmar();
  }

  return (
    <div style={OVERLAY}>
      <div className="card" style={{ padding: 24, maxWidth: 420, width: "100%", background: "var(--bg)" }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Pagar comisión a {miembro.nombre}</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 16px" }}>Tiene {dinero(miembro.saldo)} por cobrar.</p>

        <div className="field" style={{ marginBottom: 8 }}>
          <label>Monto a pagar hoy</label>
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={pago.monto} onChange={(e) => cambiar("monto", e.target.value)} autoFocus />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {atajos.map((n) => (
            <button key={n} type="button" className="btn-secondary" style={{ fontSize: 12.5, padding: "4px 10px" }} onClick={() => cambiar("monto", String(n))}>${n}</button>
          ))}
          <button type="button" className="btn-secondary" style={{ fontSize: 12.5, padding: "4px 10px" }} onClick={() => cambiar("monto", miembro.saldo.toFixed(2))}>
            Todo ({dinero(miembro.saldo)})
          </button>
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label>Forma de pago</label>
          <select value={pago.forma} onChange={(e) => cambiar("forma", e.target.value)}>
            {FORMAS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>Nota (opcional)</label>
          <input maxLength={200} placeholder="Adelanto de quincena" value={pago.nota} onChange={(e) => cambiar("nota", e.target.value)} />
        </div>

        <div style={{ background: "var(--panel-2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
          <span style={{ color: "var(--text-muted)" }}>Después de este pago le quedan</span>
          <strong>{valido ? dinero(queda) : "—"}</strong>
        </div>

        {pago.error && <div style={{ marginBottom: 14, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 10, borderRadius: 6, fontSize: 13 }}>{pago.error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={() => setPago(null)}>Cancelar</button>
          <button className="btn-primary" disabled={pago.guardando} onClick={enviar}>
            {pago.guardando ? "Guardando…" : valido ? `Registrar pago de ${dinero(monto)}` : "Registrar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistorialPagos({ pagos, staff, onAnular }) {
  const [filtro, setFiltro] = useState("");
  const [confirmar, setConfirmar] = useState(null);
  const lista = filtro ? pagos.filter((p) => p.staff_id === filtro) : pagos;
  const conPagos = staff.filter((s) => pagos.some((p) => p.staff_id === s.id));

  return (
    <div className="card" style={{ padding: "16px 20px", marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, margin: 0 }}>Historial de pagos</h2>
        {conPagos.length > 0 && (
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ width: 170 }}>
            <option value="">Todos</option>
            {conPagos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
      </div>
      {lista.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "6px 0" }}>Todavía no se ha registrado ningún pago.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 560 }}>
            <thead>
              <tr style={{ color: "var(--text-muted)", fontSize: 12.5, textAlign: "left" }}>
                <th style={TH}>Fecha</th><th style={TH}>Miembro</th><th style={TH}>Monto</th><th style={TH}>Forma</th><th style={TH}>Nota</th><th style={TH} />
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--border)", color: p.anulado ? "var(--text-muted)" : "inherit" }}>
                  <td style={TD}>{formatoDia(p.fecha)}</td>
                  <td style={TD}>{p.nombre}</td>
                  <td style={{ ...TD, fontWeight: 600, textDecoration: p.anulado ? "line-through" : "none" }}>{dinero(p.monto)}</td>
                  <td style={TD}>{nombreForma(p.forma)}</td>
                  <td style={{ ...TD, fontSize: 13 }}>
                    {p.nota || ""}
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {p.anulado ? `Anulado${p.anulado_por ? ` por ${p.anulado_por}` : ""}` : p.pagado_por ? `Registrado por ${p.pagado_por}` : ""}
                    </div>
                  </td>
                  <td style={{ ...TD, textAlign: "right", whiteSpace: "nowrap" }}>
                    {!p.anulado && (confirmar === p.id ? (
                      <>
                        <span style={{ fontSize: 12.5, marginRight: 6 }}>¿Anular?</span>
                        <button className="btn-secondary" style={{ fontSize: 12.5, padding: "4px 10px", marginRight: 4 }} onClick={() => { setConfirmar(null); onAnular(p); }}>Sí</button>
                        <button className="btn-secondary" style={{ fontSize: 12.5, padding: "4px 10px" }} onClick={() => setConfirmar(null)}>No</button>
                      </>
                    ) : (
                      <button className="btn-secondary" style={{ fontSize: 12.5, padding: "4px 10px" }} onClick={() => setConfirmar(p.id)}>Anular</button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0" }}>
        &quot;Anular&quot; es para corregir un pago registrado por error: el monto vuelve al saldo del miembro.
      </p>
    </div>
  );
}

// Periodos cerrados con el sistema anterior ("Pagar y cerrar periodo").
// Solo lectura: ya están pagados y no cuentan en los saldos.
function PeriodosAnteriores({ periodos }) {
  const [abierto, setAbierto] = useState(null);
  if (!periodos.length) return null;
  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, margin: "0 0 8px" }}>Periodos pagados (sistema anterior)</h2>
      {periodos.map((p) => (
        <div key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
          <button
            type="button"
            onClick={() => setAbierto(abierto === p.id ? null : p.id)}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--text)", textAlign: "left", flexWrap: "wrap" }}
          >
            <span style={{ fontWeight: 600 }}>{formatoDia(p.inicio)} – {formatoDia(p.fin)}</span>
            <span style={{ color: "var(--text-muted)" }}>
              {dinero(p.total)} · pagado {formatoDia(p.pagado_en)}{p.pagado_por ? ` por ${p.pagado_por}` : ""} {abierto === p.id ? "▲" : "▼"}
            </span>
          </button>
          {abierto === p.id && (
            <div style={{ paddingBottom: 10 }}>
              {(p.detalle || []).map((m) => (
                <div key={m.staffId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "3px 0 3px 12px" }}>
                  <span>{m.nombre}</span>
                  <span style={{ color: "var(--text-muted)" }}>{dinero(m.rentado)} rentado → <strong style={{ color: "var(--text)" }}>{dinero(m.total)}</strong></span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ComisionesContenido() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [abierto, setAbierto] = useState(null);
  const [cfg, setCfg] = useState({ tasa: "", metaDiaria: "", bono: "" });
  const [cfgMsg, setCfgMsg] = useState("");
  const [pago, setPago] = useState(null); // { miembro, monto, forma, nota, error, guardando }

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

  async function enviar(method, body) {
    return fetch("/api/comisiones", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then((r) => r.json())
      .catch(() => ({ error: "No se pudo guardar. Revisa tu conexión." }));
  }

  async function guardarConfig() {
    setCfgMsg("");
    const res = await enviar("PATCH", { accion: "config", tasa: Number(cfg.tasa), metaDiaria: Number(cfg.metaDiaria), bono: Number(cfg.bono) });
    if (res.error) return setCfgMsg(res.error);
    setCfgMsg("Guardado ✓");
    cargar();
  }

  async function cambiarComisiona(s, valor) {
    const res = await enviar("PATCH", { accion: "comisiona", staffId: s.id, comisiona: valor });
    if (res.error) return setError(res.error);
    cargar();
  }

  async function confirmarPago() {
    setPago((p) => ({ ...p, guardando: true, error: "" }));
    const res = await enviar("POST", { accion: "pagar", staffId: pago.miembro.staffId, monto: r2(pago.monto), forma: pago.forma, nota: pago.nota });
    if (res.error) {
      setPago((p) => ({ ...p, guardando: false, error: res.error }));
      return;
    }
    setAviso(`Pago de ${dinero(pago.monto)} a ${pago.miembro.nombre} registrado. Le quedan ${dinero(res.saldo)}.`);
    setPago(null);
    cargar();
  }

  async function anular(p) {
    const res = await enviar("POST", { accion: "anular", pagoId: p.id });
    if (res.error) return setError(res.error);
    setAviso(`Pago de ${dinero(p.monto)} a ${p.nombre} anulado.`);
    cargar();
  }

  if (error && !datos) return <div className="card" style={{ padding: 24, color: "var(--danger)" }}>{error}</div>;
  if (!datos) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;

  const { equipo, staff, pagos, periodosAnteriores, inicio } = datos;

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Comisiones</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 22px" }}>
        Cada miembro tiene un saldo que corre siempre: lo ganado menos lo pagado. Puedes pagarle a cualquiera, cuando quieras y el monto que quieras.
      </p>

      {error && <div style={{ marginBottom: 14, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 10, borderRadius: 6, fontSize: 13 }}>{error}</div>}
      {aviso && <div style={{ marginBottom: 14, background: "#DCEAE1", color: "#245939", padding: 10, borderRadius: 6, fontSize: 13 }}>{aviso}</div>}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <Stat label="Rentado por el equipo" value={dinero(equipo.rentado)} />
        <Stat label="Comisiones ganadas" value={dinero(equipo.ganado)} />
        <Stat label="Ya pagado" value={dinero(equipo.pagado)} />
        <Stat label="Por pagar" value={dinero(equipo.saldo)} color="#8A5A03" fondo="#FAEEDA" />
        <Stat label="Sin comisión (web u otros)" value={dinero(equipo.sinComision)} />
      </div>

      <div className="card" style={{ padding: "16px 20px", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, margin: 0 }}>Saldo de cada miembro</h2>
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Desde {formatoDia(inicio)}</span>
        </div>
        <TablaSaldos
          miembros={equipo.miembros}
          pagos={pagos}
          abierto={abierto}
          setAbierto={setAbierto}
          onPagar={(m) => { setAviso(""); setPago({ miembro: m, monto: "", forma: "efectivo", nota: "", error: "", guardando: false }); }}
        />
      </div>

      <HistorialPagos pagos={pagos} staff={staff} onAnular={anular} />

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
            Al cambiar las reglas se recalcula lo ganado desde {formatoDia(inicio)}. Los pagos ya hechos no cambian, así que el saldo de cada miembro puede subir o bajar.
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

      <PeriodosAnteriores periodos={periodosAnteriores || []} />

      {pago && <VentanaPago pago={pago} setPago={setPago} onConfirmar={confirmarPago} />}
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
