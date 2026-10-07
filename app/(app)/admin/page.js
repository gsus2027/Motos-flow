"use client";
import { useEffect, useState } from "react";
import ContratoModal from "@/components/ContratoModal";
import ContratoModalEbike from "@/components/ContratoModalEbike";
import ImagenPrivada from "@/components/ImagenPrivada";
import { useStaffActual } from "@/lib/staffContext";

function formatoDia(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function diasEntre(isoA, isoB) {
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.round((b - a) / 86400000);
}
function sumarDias(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}
function dinero(n) {
  const v = Math.round(Number(n || 0) * 100) / 100;
  return "$" + (Number.isInteger(v) ? v : v.toFixed(2));
}
const OVERLAY = { position: "fixed", inset: 0, background: "rgba(20,18,15,.6)", zIndex: 40, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "26px 16px", overflowY: "auto" };
function Etiqueta({ children, bg, fg }) {
  return <span style={{ fontSize: 11, fontWeight: 600, background: bg, color: fg, padding: "1px 7px", borderRadius: 6, marginLeft: 6 }}>{children}</span>;
}
function Fila({ izq, der, fuerte }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: fuerte ? 600 : 400, fontSize: fuerte ? 14.5 : 13 }}>
      <span style={{ color: fuerte ? "var(--text)" : "var(--text-muted)" }}>{izq}</span><span>{der}</span>
    </div>
  );
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function estadoRenta(r) {
  if (r.estado === "devuelta") return "devuelta";
  const dif = diasEntre(hoyISO(), r.fecha_prevista);
  if (dif < 0) return "vencida";
  if (dif <= 1) return "por vencer";
  return "activa";
}
function estadoExtras(extras) {
  if (!Array.isArray(extras) || extras.length === 0) return { texto: "Sin extras por retornar", color: "var(--text-muted)" };
  const faltantes = extras.filter((e) => e.devuelto !== true);
  if (faltantes.length === 0) return { texto: `Extras: ${extras.map((e) => e.nombre).join(", ")}`, color: "var(--text-muted)" };
  return { texto: `Falta: ${faltantes.map((e) => e.nombre).join(", ")}`, color: "var(--danger)" };
}
const ESTILOS = {
  vencida: { bg: "#F6DEDA", fg: "#8E2A1C", dot: "#C0392B" },
  "por vencer": { bg: "#FBEACB", fg: "#8A5A03", dot: "#F0A202" },
  activa: { bg: "#DCEAE1", fg: "#245939", dot: "#3F7D58" },
};
function Badge({ estado }) {
  const s = ESTILOS[estado] || ESTILOS.activa;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: s.bg, color: s.fg, padding: "3px 10px", borderRadius: 3, fontSize: 12.5, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {estado}
    </span>
  );
}
function Stat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: "16px 22px", minWidth: 140 }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 600, color: color || "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
function EtiquetaTipo({ tipo }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: "#6B6255", background: "#F3EEE2", padding: "2px 8px", borderRadius: 3, textTransform: "uppercase" }}>
      {tipo === "ebike" ? "Ebike" : "Moto"}
    </span>
  );
}

export default function Panel() {
  const [motos, setMotos] = useState([]);
  const [ebikes, setEbikes] = useState([]);
  const [rentas, setRentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [contratoVisible, setContratoVisible] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const [cambiandoMoto, setCambiandoMoto] = useState(null); // { renta, motosDisponibles, elegida, error, guardando }
  const [extendiendo, setExtendiendo] = useState(null); // { renta, fecha, calculo, calculando, error, guardando }
  const [ajustando, setAjustando] = useState(null); // { renta, nuevoTotal, motivo, error, guardando }
  const { staffActual } = useStaffActual();
  const esAdmin = Boolean(staffActual?.es_admin);

  async function cargar() {
    setCargando(true);
    const [rm, rr, re, rre] = await Promise.all([
      fetch("/api/motos").then((r) => r.json()),
      fetch("/api/rentas").then((r) => r.json()),
      fetch("/api/ebikes").then((r) => r.json()),
      fetch("/api/rentas-ebike").then((r) => r.json()),
    ]);
    setMotos(rm.motos || []);
    setEbikes(re.ebikes || []);
    const rentasMoto = (rr.rentas || []).map((r) => ({ ...r, _tipo: "moto", _vehiculo: r.motos ? `${r.motos.placa} — ${r.motos.modelo}` : "—" }));
    const rentasEbike = (rre.rentas || []).map((r) => ({ ...r, _tipo: "ebike", _vehiculo: r.ebikes ? `Ebike ${r.ebikes.numero}` : "—" }));
    setRentas([...rentasMoto, ...rentasEbike]);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function marcarDevuelta(r, extras) {
    const endpoint = r._tipo === "ebike" ? "/api/rentas-ebike" : "/api/rentas";
    const body = { id: r.id };
    if (extras) body.extras = extras;
    await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setConfirmando(null);
    cargar();
  }

  function iniciarDevolucion(r) {
    if (Array.isArray(r.extras) && r.extras.length > 0) {
      setConfirmando({ renta: r, estado: Object.fromEntries(r.extras.map((e) => [e.id, null])) });
    } else {
      marcarDevuelta(r);
    }
  }

  // Cambiar la moto asignada a una renta activa (por ejemplo, si la
  // moto entregada no arranca). Solo aplica a rentas de moto, no ebike.
  async function abrirCambioMoto(r) {
    setCambiandoMoto({ renta: r, motosDisponibles: null, elegida: "", error: "", guardando: false });
    const res = await fetch("/api/motos?disponibles=1").then((x) => x.json());
    setCambiandoMoto((c) => (c && c.renta.id === r.id ? { ...c, motosDisponibles: res.motos || [] } : c));
  }

  async function confirmarCambioMoto() {
    if (!cambiandoMoto?.elegida) return;
    setCambiandoMoto((c) => ({ ...c, guardando: true, error: "" }));
    const res = await fetch("/api/rentas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cambiandoMoto.renta.id, accion: "cambiarMoto", nuevoMotoId: cambiandoMoto.elegida }),
    }).then((x) => x.json());
    if (res.error) {
      setCambiandoMoto((c) => ({ ...c, guardando: false, error: res.error }));
      return;
    }
    setCambiandoMoto(null);
    cargar();
  }

  // ---- Extender días (todo el equipo) ----
  function endpointDe(r) {
    return r._tipo === "ebike" ? "/api/rentas-ebike" : "/api/rentas";
  }
  async function calcularExtension(renta, fecha) {
    setExtendiendo((c) => (c ? { ...c, fecha, calculando: true, error: "", calculo: null } : c));
    const res = await fetch(endpointDe(renta), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: renta.id, accion: "extender", nuevaFechaPrevista: fecha, soloCalcular: true }),
    }).then((x) => x.json()).catch(() => ({ error: "No se pudo calcular. Revisa tu conexión." }));
    setExtendiendo((c) => {
      if (!c || c.renta.id !== renta.id || c.fecha !== fecha) return c; // el usuario ya cambió la fecha
      return { ...c, calculando: false, calculo: res.calculo || null, error: res.error || "" };
    });
  }
  function abrirExtension(r) {
    const fecha = sumarDias(r.fecha_prevista, 1);
    setExtendiendo({ renta: r, fecha, calculo: null, calculando: true, error: "", guardando: false });
    calcularExtension(r, fecha);
  }
  async function confirmarExtension() {
    if (!extendiendo?.calculo) return;
    setExtendiendo((c) => ({ ...c, guardando: true, error: "" }));
    const res = await fetch(endpointDe(extendiendo.renta), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: extendiendo.renta.id, accion: "extender", nuevaFechaPrevista: extendiendo.fecha }),
    }).then((x) => x.json()).catch(() => ({ error: "No se pudo guardar. Revisa tu conexión." }));
    if (res.error) {
      setExtendiendo((c) => ({ ...c, guardando: false, error: res.error }));
      return;
    }
    setExtendiendo(null);
    cargar();
  }

  // ---- Ajustar tarifa (solo administrador) ----
  function abrirAjuste(r) {
    setAjustando({ renta: r, nuevoTotal: String(r.tarifa_total ?? ""), motivo: "", error: "", guardando: false });
  }
  async function confirmarAjuste() {
    const nuevo = Number(String(ajustando.nuevoTotal).replace(/[$,\s]/g, ""));
    if (!Number.isFinite(nuevo) || nuevo < 0) {
      setAjustando((c) => ({ ...c, error: "Escribe un total válido." }));
      return;
    }
    if (!ajustando.motivo.trim()) {
      setAjustando((c) => ({ ...c, error: "Escribe el motivo del ajuste." }));
      return;
    }
    setAjustando((c) => ({ ...c, guardando: true, error: "" }));
    const res = await fetch(endpointDe(ajustando.renta), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ajustando.renta.id, accion: "ajustarTarifa", nuevoTotal: nuevo, motivo: ajustando.motivo.trim() }),
    }).then((x) => x.json()).catch(() => ({ error: "No se pudo guardar. Revisa tu conexión." }));
    if (res.error) {
      setAjustando((c) => ({ ...c, guardando: false, error: res.error }));
      return;
    }
    setAjustando(null);
    cargar();
  }

  if (cargando) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;

  const rentasActivas = rentas.filter((r) => r.estado !== "devuelta").sort((a, b) => a.fecha_prevista.localeCompare(b.fecha_prevista));
  const totalVehiculos = motos.length + ebikes.length;
  const disponibles = totalVehiculos - rentasActivas.length;
  const vencidas = rentasActivas.filter((r) => estadoRenta(r) === "vencida").length;

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Panel</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>Estado actual de la flota (motos + ebikes) y las rentas en curso.</p>

      <div style={{ display: "flex", gap: 14, marginBottom: 30, flexWrap: "wrap" }}>
        <Stat label="Vehículos en flota" value={totalVehiculos} />
        <Stat label="Disponibles" value={Math.max(disponibles, 0)} color="#3F7D58" />
        <Stat label="Rentados" value={rentasActivas.length} color="#8A5A03" />
        <Stat label="Vencidos" value={vencidas} color="#C0392B" />
      </div>

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, margin: "0 0 12px" }}>Rentas en curso</h2>
      {rentasActivas.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--text-muted)", fontSize: 14.5 }}>
          No hay vehículos rentados en este momento. Ve a "Nueva renta" para registrar una.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rentasActivas.map((r) => (
            <div key={`${r._tipo}-${r.id}`} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <ImagenPrivada path={r.foto_carnet_url} alt="Carnet" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: 4 }} />
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{r.cliente}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{r.cedula}</div>
                {r.atendido_por && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Atendió: {r.atendido_por}</div>}
                <div style={{ fontSize: 12, color: estadoExtras(r.extras).color }}>{estadoExtras(r.extras).texto}</div>
                <div style={{ fontSize: 12.5, marginTop: 3 }}>
                  Total: <strong>{dinero(r.tarifa_total)}</strong>
                  {Number(r.dias_extendidos) > 0 && <Etiqueta bg="var(--highlight-bg)" fg="var(--highlight-text)">+{r.dias_extendidos} {Number(r.dias_extendidos) === 1 ? "día" : "días"}</Etiqueta>}
                  {r.tarifa_original !== null && r.tarifa_original !== undefined && (
                    <span title={`Original: ${dinero(r.tarifa_original)} — ${r.ajuste_motivo || ""}${r.ajustado_por ? ` (${r.ajustado_por})` : ""}`}>
                      <Etiqueta bg="var(--warning-bg)" fg="var(--warning-text)">ajustado</Etiqueta>
                    </span>
                  )}
                </div>
              </div>
              <EtiquetaTipo tipo={r._tipo} />
              <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{r._vehiculo}</div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Devuelve</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{formatoDia(r.fecha_prevista)}</div>
                </div>
                <Badge estado={estadoRenta(r)} />
                <button className="btn-secondary" onClick={() => setContratoVisible(r)}>
                  Contrato ({r.idioma === "en" ? "EN" : "ES"})
                </button>
                {r._tipo === "moto" && (
                  <button className="btn-secondary" onClick={() => abrirCambioMoto(r)}>🔄 Cambiar moto</button>
                )}
                <button className="btn-secondary" onClick={() => abrirExtension(r)}>📅 Extender días</button>
                {esAdmin && (
                  <button className="btn-secondary" onClick={() => abrirAjuste(r)}>✏️ Ajustar tarifa</button>
                )}
                <button className="btn-secondary" onClick={() => iniciarDevolucion(r)}>Marcar devuelta</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contratoVisible && contratoVisible._tipo === "ebike" && (
        <ContratoModalEbike renta={contratoVisible} ebike={contratoVisible.ebikes} onCerrar={() => setContratoVisible(null)} />
      )}
      {contratoVisible && contratoVisible._tipo === "moto" && (
        <ContratoModal renta={contratoVisible} moto={contratoVisible.motos} onCerrar={() => setContratoVisible(null)} />
      )}

      {extendiendo && (
        <div style={OVERLAY}>
          <div className="card" style={{ padding: 24, maxWidth: 420, width: "100%", background: "var(--bg)" }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Extender renta</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              {extendiendo.renta.cliente} — {extendiendo.renta._vehiculo}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Devolución actual</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{formatoDia(extendiendo.renta.fecha_prevista)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Nueva devolución</div>
                <input
                  type="date"
                  value={extendiendo.fecha}
                  min={sumarDias(extendiendo.renta.fecha_prevista, 1)}
                  onChange={(e) => e.target.value && calcularExtension(extendiendo.renta, e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[1, 2, 3].map((n) => {
                const f = sumarDias(extendiendo.renta.fecha_prevista, n);
                const activo = extendiendo.fecha === f;
                return (
                  <button
                    key={n}
                    type="button"
                    className="btn-secondary"
                    onClick={() => calcularExtension(extendiendo.renta, f)}
                    style={activo ? { borderColor: "var(--amber)", color: "var(--amber)" } : undefined}
                  >
                    +{n} {n === 1 ? "día" : "días"}
                  </button>
                );
              })}
            </div>

            <div style={{ background: "var(--panel-2)", borderRadius: 10, padding: "12px 14px", minHeight: 60 }}>
              {extendiendo.calculando ? (
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Calculando…</div>
              ) : extendiendo.calculo ? (
                <>
                  <Fila izq={`${extendiendo.calculo.diasExtra} × ${dinero(extendiendo.calculo.tarifaDia)} (tarifa diaria)`} der={dinero(extendiendo.calculo.costoBase)} />
                  {extendiendo.calculo.costoCobertura > 0 && (
                    <Fila izq={`Cobertura premium ${extendiendo.calculo.diasExtra} × ${dinero(extendiendo.calculo.coberturaDia)}`} der={dinero(extendiendo.calculo.costoCobertura)} />
                  )}
                  {extendiendo.calculo.lineasExtras.map((l, i) => (
                    <Fila key={i} izq={`${l.nombre} ${extendiendo.calculo.diasExtra} × ${dinero(l.porDia)}`} der={dinero(l.costo)} />
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)", margin: "6px 0 4px" }} />
                  <Fila izq="Total anterior" der={dinero(extendiendo.calculo.totalAnterior)} />
                  <Fila fuerte izq="Nuevo total" der={<span style={{ color: "#245939" }}>{dinero(extendiendo.calculo.nuevoTotal)} <span style={{ fontSize: 12, fontWeight: 400 }}>(+{dinero(extendiendo.calculo.total)})</span></span>} />
                </>
              ) : null}
            </div>

            {extendiendo.error && (
              <div style={{ marginTop: 14, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 10, borderRadius: 6, fontSize: 13 }}>
                {extendiendo.error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setExtendiendo(null)}>Cancelar</button>
              <button
                className="btn-primary"
                disabled={!extendiendo.calculo || extendiendo.calculando || extendiendo.guardando}
                onClick={confirmarExtension}
              >
                {extendiendo.guardando ? "Guardando…" : "Confirmar extensión"}
              </button>
            </div>
          </div>
        </div>
      )}

      {ajustando && (() => {
        const actual = Number(ajustando.renta.tarifa_total || 0);
        const nuevo = Number(String(ajustando.nuevoTotal).replace(/[$,\s]/g, ""));
        const dif = Number.isFinite(nuevo) ? Math.round((nuevo - actual) * 100) / 100 : null;
        const yaAjustada = ajustando.renta.tarifa_original !== null && ajustando.renta.tarifa_original !== undefined;
        return (
          <div style={OVERLAY}>
            <div className="card" style={{ padding: 24, maxWidth: 420, width: "100%", background: "var(--bg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Ajustar tarifa</span>
                <span style={{ fontSize: 11, fontWeight: 600, background: "var(--warning-bg)", color: "var(--warning-text)", padding: "2px 8px", borderRadius: 6 }}>solo admin</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 16px" }}>
                {ajustando.renta.cliente} — {ajustando.renta._vehiculo}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total actual</div>
                  <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{dinero(actual)}</div>
                  {yaAjustada && <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Formulario: {dinero(ajustando.renta.tarifa_original)}</div>}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Nuevo total ($)</div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={ajustando.nuevoTotal}
                    onChange={(e) => setAjustando((c) => ({ ...c, nuevoTotal: e.target.value, error: "" }))}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Motivo (obligatorio)</div>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="Descuento cliente frecuente"
                  value={ajustando.motivo}
                  onChange={(e) => setAjustando((c) => ({ ...c, motivo: e.target.value, error: "" }))}
                  style={{ width: "100%" }}
                />
              </div>
              {dif !== null && dif !== 0 && (
                <div style={{ background: "var(--warning-bg)", color: "var(--warning-text)", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
                  Diferencia: {dif > 0 ? "+" : "−"}{dinero(Math.abs(dif))}. Se actualiza en Dinero, Historial y el contrato. El precio original queda guardado.
                </div>
              )}
              {ajustando.error && (
                <div style={{ marginTop: 14, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 10, borderRadius: 6, fontSize: 13 }}>
                  {ajustando.error}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="btn-secondary" onClick={() => setAjustando(null)}>Cancelar</button>
                <button className="btn-primary" disabled={ajustando.guardando} onClick={confirmarAjuste}>
                  {ajustando.guardando ? "Guardando…" : "Guardar ajuste"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {cambiandoMoto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,15,.6)", zIndex: 40, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "26px 16px", overflowY: "auto" }}>
          <div className="card" style={{ padding: 24, maxWidth: 420, width: "100%", background: "var(--bg)" }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Cambiar moto</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 18px" }}>
              Renta de {cambiandoMoto.renta.cliente} — actualmente {cambiandoMoto.renta._vehiculo}
            </p>

            {cambiandoMoto.motosDisponibles === null ? (
              <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Cargando motos disponibles…</p>
            ) : cambiandoMoto.motosDisponibles.length === 0 ? (
              <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>No hay ninguna otra moto disponible en este momento.</p>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Elige la moto disponible que la reemplazará:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, maxHeight: 260, overflowY: "auto" }}>
                  {cambiandoMoto.motosDisponibles.map((m) => (
                    <label
                      key={m.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                        border: cambiandoMoto.elegida === m.id ? "1.5px solid var(--acento, #0071E3)" : "1px solid var(--border)",
                      }}
                    >
                      <input
                        type="radio"
                        name="moto-reemplazo"
                        checked={cambiandoMoto.elegida === m.id}
                        onChange={() => setCambiandoMoto((c) => ({ ...c, elegida: m.id, error: "" }))}
                      />
                      <span style={{ fontSize: 14 }}>{m.placa} — {m.modelo}</span>
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--panel-2)", padding: "10px 12px", borderRadius: 8, marginBottom: 16 }}>
                  ℹ️ La moto {cambiandoMoto.renta._vehiculo} quedará disponible otra vez. El contrato del cliente se actualizará con la nueva moto.
                </div>
              </>
            )}

            {cambiandoMoto.error && (
              <div style={{ marginBottom: 14, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 10, borderRadius: 6, fontSize: 13 }}>
                {cambiandoMoto.error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" onClick={() => setCambiandoMoto(null)}>Cancelar</button>
              <button
                className="btn-primary"
                disabled={!cambiandoMoto.elegida || cambiandoMoto.guardando}
                onClick={confirmarCambioMoto}
              >
                {cambiandoMoto.guardando ? "Guardando…" : "Confirmar cambio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,15,.6)", zIndex: 40, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "26px 16px", overflowY: "auto" }}>
          <div className="card" style={{ padding: 24, maxWidth: 420, width: "100%", background: "var(--bg)" }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{confirmando.renta.cliente} — {confirmando.renta._vehiculo}</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>Extras que se llevó — marca cuáles devolvió:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {confirmando.renta.extras.map((ex) => (
                <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
                  <span style={{ fontSize: 14 }}>{ex.nombre}</span>
                  <span style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setConfirmando((c) => ({ ...c, estado: { ...c.estado, [ex.id]: true } }))}
                      style={{
                        padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "none", cursor: "pointer",
                        background: confirmando.estado[ex.id] === true ? "#E8F7ED" : "var(--panel-2)",
                        color: confirmando.estado[ex.id] === true ? "#1E7A38" : "var(--text-muted)",
                      }}
                    >
                      Devuelto
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando((c) => ({ ...c, estado: { ...c.estado, [ex.id]: false } }))}
                      style={{
                        padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "none", cursor: "pointer",
                        background: confirmando.estado[ex.id] === false ? "var(--danger-bg)" : "var(--panel-2)",
                        color: confirmando.estado[ex.id] === false ? "var(--danger-text)" : "var(--text-muted)",
                      }}
                    >
                      No devuelto
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" onClick={() => setConfirmando(null)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={() => marcarDevuelta(
                  confirmando.renta,
                  confirmando.renta.extras.map((ex) => ({ ...ex, devuelto: confirmando.estado[ex.id] === true }))
                )}
              >
                Marcar como devuelta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
