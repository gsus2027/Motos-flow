"use client";
import { useEffect, useState } from "react";
import ContratoModal from "@/components/ContratoModal";
import ContratoModalEbike from "@/components/ContratoModalEbike";
import { agruparPorContrato } from "@/lib/contratoMultiple";
import ImagenPrivada from "@/components/ImagenPrivada";
import MisComisiones from "@/components/MisComisiones";
import CobroModal from "@/components/CobroModal";
import { useStaffActual } from "@/lib/staffContext";
import { estadoCobro, claveRenta, METODO_COBRO_LABELS } from "@/lib/cobros";

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

// Cuadre de pagos (13-oct-2026): debajo del nombre del cliente, si ya pagó
// (y cómo) o cuánto falta.
function EstadoCobro({ cobro }) {
  const { pagado, pendiente, cobros, sinDatos } = cobro;
  if (sinDatos) return null;
  const pill = (texto, bg, fg) => (
    <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, background: bg, color: fg, padding: "3px 10px", borderRadius: 20, marginTop: 4 }}>{texto}</span>
  );
  if (pendiente <= 0 && pagado > 0) {
    const ultimo = cobros[cobros.length - 1];
    const metodos = [...new Set(cobros.map((c) => METODO_COBRO_LABELS[c.metodo] || c.metodo))].join(" + ");
    const aut = cobros.length === 1 && ultimo?.autorizacion_ult4 ? ` ···${ultimo.autorizacion_ult4}` : "";
    return <div>{pill(`Cobrado · ${metodos}${aut}`, "#E6F2E9", "#1E5E34")}</div>;
  }
  if (pendiente > 0 && pagado > 0) {
    return <div>{pill(`Pagó ${dinero(pagado)} · falta ${dinero(pendiente)}`, "var(--warning-bg)", "var(--warning-text)")}</div>;
  }
  if (pendiente > 0) return <div>{pill(`Falta cobrar ${dinero(pendiente)}`, "var(--warning-bg)", "var(--warning-text)")}</div>;
  return null;
}

export default function Panel() {
  const [motos, setMotos] = useState([]);
  const [ebikes, setEbikes] = useState([]);
  const [rentas, setRentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [contratoVisible, setContratoVisible] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const [cambiandoMoto, setCambiandoMoto] = useState(null); // { renta, motosDisponibles, elegida, error, guardando }
  const [agregando, setAgregando] = useState(null); // 18-oct-2026: { renta, disponibles, elegida, precio, calculando, error, guardando }
  const [extendiendo, setExtendiendo] = useState(null); // { renta, fecha, calculo, calculando, error, guardando }
  const [ajustando, setAjustando] = useState(null); // { renta, nuevoTotal, motivo, error, guardando }
  // Cuadre de pagos (13-oct-2026): cobros de las rentas activas, agrupados
  // por renta, y la ventana "Cobrar" abierta (si hay).
  const [cobrosPorRenta, setCobrosPorRenta] = useState({});
  const [cobrando, setCobrando] = useState(null); // { renta, pendiente, luegoDevolver }
  const { staffActual } = useStaffActual();
  const esAdmin = Boolean(staffActual?.es_admin);

  async function cargar() {
    setCargando(true);
    const [rm, rr, re, rre, rc] = await Promise.all([
      fetch("/api/motos").then((r) => r.json()),
      fetch("/api/rentas").then((r) => r.json()),
      fetch("/api/ebikes").then((r) => r.json()),
      fetch("/api/rentas-ebike").then((r) => r.json()),
      // Si todavía no se corrió supabase-schema-cobros.sql esto falla: el
      // Panel sigue funcionando igual que antes, solo sin estado de cobro.
      fetch("/api/cobros").then((r) => r.json()).catch(() => ({})),
    ]);
    const agrupados = {};
    for (const c of rc.cobros || []) {
      const k = claveRenta(c.renta_tipo, c.renta_id);
      (agrupados[k] = agrupados[k] || []).push(c);
    }
    setCobrosPorRenta(Array.isArray(rc.cobros) ? agrupados : null);
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

  function cobroDe(r) {
    // null = la tabla de cobros todavía no existe: no se muestra nada de cobro.
    if (!cobrosPorRenta) return { total: Number(r.tarifa_total || 0), pagado: 0, pendiente: 0, cobros: [], sinDatos: true };
    return estadoCobro(r, cobrosPorRenta[claveRenta(r._tipo, r.id)]);
  }

  function iniciarDevolucion(r, { sinCobrar = false } = {}) {
    // Antes de devolver, si falta plata, primero se ofrece cobrar.
    const { pendiente } = cobroDe(r);
    if (!sinCobrar && pendiente > 0) {
      setCobrando({ renta: r, pendiente, luegoDevolver: true });
      return;
    }
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

  // ---- Agregar otra moto / e-bike al mismo contrato (18-oct-2026) ----
  async function abrirAgregar(r) {
    setAgregando({ renta: r, disponibles: null, elegida: "", precio: null, calculando: false, error: "", guardando: false });
    const url = r._tipo === "ebike" ? "/api/ebikes?disponibles=1" : "/api/motos?disponibles=1";
    const res = await fetch(url).then((x) => x.json()).catch(() => ({}));
    const lista = (r._tipo === "ebike" ? res.ebikes : res.motos) || [];
    setAgregando((c) => (c && c.renta.id === r.id ? { ...c, disponibles: lista } : c));
  }
  async function elegirAgregar(vehiculoId) {
    const r = agregando.renta;
    setAgregando((c) => ({ ...c, elegida: vehiculoId, precio: null, calculando: true, error: "" }));
    const res = await fetch(endpointDe(r), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, accion: "precioAgregarVehiculo", vehiculoId }),
    }).then((x) => x.json()).catch(() => ({ error: "No se pudo calcular. Revisa tu conexión." }));
    setAgregando((c) => (c && c.elegida === vehiculoId ? { ...c, calculando: false, precio: res.precio || null, error: res.error || "" } : c));
  }
  async function confirmarAgregar() {
    if (!agregando?.elegida || !agregando.precio) return;
    setAgregando((c) => ({ ...c, guardando: true, error: "" }));
    const res = await fetch(endpointDe(agregando.renta), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: agregando.renta.id, accion: "agregarVehiculo", vehiculoId: agregando.elegida }),
    }).then((x) => x.json()).catch(() => ({ error: "No se pudo guardar. Revisa tu conexión." }));
    if (res.error) {
      setAgregando((c) => ({ ...c, guardando: false, error: res.error }));
      return;
    }
    setAgregando(null);
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
    const rentaExtendida = extendiendo.renta;
    setExtendiendo(null);
    // Al extender, se ofrece cobrar los días nuevos de una vez.
    if (res.renta) {
      const actualizada = { ...rentaExtendida, ...res.renta };
      const { pendiente } = cobroDe(actualizada);
      if (pendiente > 0) setCobrando({ renta: actualizada, pendiente, luegoDevolver: false });
    }
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

  // 18-oct-2026: tarjeta de una renta en curso. Dentro de un contrato con
  // varios vehículos (enGrupo), el cobro y el contrato van en el encabezado del grupo.
  function tarjetaRenta(r, { enGrupo = false } = {}) {
    return (
            <div key={`${r._tipo}-${r.id}`} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <ImagenPrivada path={r.foto_carnet_url} alt="Carnet" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: 4 }} />
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{r.cliente}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{r.cedula}</div>
                {r.atendido_por && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Atendió: {r.atendido_por}</div>}
                <div style={{ fontSize: 12, color: estadoExtras(r.extras).color }}>{estadoExtras(r.extras).texto}</div>
                <EstadoCobro cobro={cobroDe(r)} />
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
              <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
                {r._vehiculo}
                {r.agregado_por && <div style={{ fontSize: 12 }}>agregada por {r.agregado_por}</div>}
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Devuelve</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{formatoDia(r.fecha_prevista)}</div>
                </div>
                <Badge estado={estadoRenta(r)} />
                {!enGrupo && cobroDe(r).pendiente > 0 && (
                  <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 15 }} onClick={() => setCobrando({ renta: r, pendiente: cobroDe(r).pendiente, luegoDevolver: false })}>
                    Cobrar {dinero(cobroDe(r).pendiente)}
                  </button>
                )}
                {!enGrupo && (
                  <button className="btn-secondary" onClick={() => setContratoVisible(r)}>
                    Contrato ({r.idioma === "en" ? "EN" : "ES"})
                  </button>
                )}
                {!enGrupo && (
                  <button className="btn-secondary" style={{ borderColor: "var(--amber)", color: "var(--amber)", fontWeight: 600, whiteSpace: "nowrap" }} onClick={() => abrirAgregar(r)}>
                    ➕ Otra {r._tipo === "ebike" ? "e-bike" : "moto"}
                  </button>
                )}
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
    );
  }

  if (cargando) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;

  const rentasActivas = rentas.filter((r) => r.estado !== "devuelta").sort((a, b) => a.fecha_prevista.localeCompare(b.fecha_prevista));
  const totalVehiculos = motos.length + ebikes.length;
  const disponibles = totalVehiculos - rentasActivas.length;
  const vencidas = rentasActivas.filter((r) => estadoRenta(r) === "vencida").length;
  const porCobrar = Math.round(rentasActivas.reduce((s, r) => s + cobroDe(r).pendiente, 0) * 100) / 100;

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Panel</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>Estado actual de la flota (motos + ebikes) y las rentas en curso.</p>

      <MisComisiones />

      <div style={{ display: "flex", gap: 14, marginBottom: 30, flexWrap: "wrap" }}>
        <Stat label="Vehículos en flota" value={totalVehiculos} />
        <Stat label="Disponibles" value={Math.max(disponibles, 0)} color="#3F7D58" />
        <Stat label="Rentados" value={rentasActivas.length} color="#8A5A03" />
        <Stat label="Vencidos" value={vencidas} color="#C0392B" />
        <Stat label="Por cobrar" value={dinero(porCobrar)} color={porCobrar > 0 ? "#8A6100" : undefined} />
      </div>

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, margin: "0 0 12px" }}>Rentas en curso</h2>
      {rentasActivas.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--text-muted)", fontSize: 14.5 }}>
          No hay vehículos rentados en este momento. Ve a "Nueva renta" para registrar una.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {agruparPorContrato(rentasActivas).map((grupo) => {
            if (grupo.length === 1) return tarjetaRenta(grupo[0]);
            const r0 = grupo[0];
            const total = grupo.reduce((n, x) => n + Number(x.tarifa_total || 0), 0);
            const pendiente = Math.round(grupo.reduce((n, x) => n + cobroDe(x).pendiente, 0) * 100) / 100;
            const pagado = Math.round(grupo.reduce((n, x) => n + cobroDe(x).pagado, 0) * 100) / 100;
            const nombreTipo = r0._tipo === "ebike" ? "e-bikes" : "motos";
            return (
              <div key={`grupo-${r0._tipo}-${r0.id}`} style={{ border: "1.5px solid var(--highlight-border)", background: "#F7FBFF", borderRadius: 20, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "2px 6px 4px" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {r0.cliente} · <span style={{ color: "var(--highlight-text)" }}>contrato con {grupo.length} {nombreTipo}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                      {r0.cedula} · Total del contrato <strong style={{ color: "var(--text)" }}>{dinero(total)}</strong>
                    </div>
                    {!cobroDe(r0).sinDatos && (
                      <EstadoCobro cobro={{ pagado, pendiente, cobros: grupo.flatMap((x) => cobroDe(x).cobros), sinDatos: false }} />
                    )}
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {pendiente > 0 && (
                      <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 15 }} onClick={() => setCobrando({ renta: r0, grupo, pendiente, luegoDevolver: false })}>
                        Cobrar {dinero(pendiente)}
                      </button>
                    )}
                    <button className="btn-secondary" onClick={() => setContratoVisible(r0)}>
                      Contrato ({r0.idioma === "en" ? "EN" : "ES"})
                    </button>
                    <button className="btn-secondary" style={{ borderColor: "var(--amber)", color: "var(--amber)", fontWeight: 600, whiteSpace: "nowrap" }} onClick={() => abrirAgregar(r0)}>
                      ➕ Otra {r0._tipo === "ebike" ? "e-bike" : "moto"}
                    </button>
                  </div>
                </div>
                {grupo.map((x) => tarjetaRenta(x, { enGrupo: true }))}
              </div>
            );
          })}
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

      {agregando && (() => {
        const r = agregando.renta;
        const esEbike = r._tipo === "ebike";
        const nombre = (v) => (esEbike ? `Ebike ${v.numero}` : `${v.placa} — ${v.modelo}`);
        const elegido = (agregando.disponibles || []).find((v) => v.id === agregando.elegida);
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,15,.6)", zIndex: 40, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "26px 16px", overflowY: "auto" }}>
            <div className="card" style={{ padding: 24, maxWidth: 460, width: "100%", background: "var(--bg)" }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Agregar otra {esEbike ? "e-bike" : "moto"} al contrato</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
                Contrato de {r.cliente} · {formatoDia(r.fecha_entrega)} → {formatoDia(r.fecha_prevista)}
              </p>
              {agregando.disponibles === null ? (
                <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Cargando {esEbike ? "e-bikes" : "motos"} disponibles…</p>
              ) : agregando.disponibles.length === 0 ? (
                <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>No hay ninguna {esEbike ? "e-bike" : "moto"} disponible en este momento.</p>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{esEbike ? "E-bikes" : "Motos"} disponibles:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, maxHeight: 260, overflowY: "auto" }}>
                    {agregando.disponibles.map((v) => (
                      <label
                        key={v.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                          border: agregando.elegida === v.id ? "1.5px solid var(--amber)" : "1px solid var(--border)",
                          background: agregando.elegida === v.id ? "var(--highlight-bg)" : undefined,
                        }}
                      >
                        <input type="radio" name="vehiculo-agregar" checked={agregando.elegida === v.id} onChange={() => elegirAgregar(v.id)} />
                        <span style={{ fontSize: 14 }}>{nombre(v)}</span>
                      </label>
                    ))}
                  </div>
                  {agregando.calculando && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Calculando el precio…</p>}
                  {agregando.precio && elegido && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginBottom: 12, fontSize: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{nombre(elegido)} · {agregando.precio.dias} {agregando.precio.dias === 1 ? "día" : "días"}</span>
                        <span>{dinero(agregando.precio.base)}</span>
                      </div>
                      {!esEbike && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Cobertura {r.cobertura === "premium" ? "premium" : "básica"} (igual que el contrato)</span>
                          <span>{dinero(agregando.precio.cobertura)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, marginTop: 6 }}>
                        <span>Se agrega al contrato</span>
                        <span>{dinero(agregando.precio.total)}</span>
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--panel-2)", padding: "10px 12px", borderRadius: 8, marginBottom: 16 }}>
                    ℹ️ Se usan los datos, la firma y las fechas del contrato; el cliente no vuelve a llenar nada. El contrato se actualiza solo con todos los vehículos y el total nuevo, y se le reenvía por correo. Los extras (casco, candado…) se agregan aparte, como hoy.
                  </div>
                </>
              )}
              {agregando.error && (
                <div style={{ marginBottom: 14, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 10, borderRadius: 6, fontSize: 13 }}>{agregando.error}</div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-secondary" onClick={() => setAgregando(null)}>Cancelar</button>
                <button className="btn-primary" disabled={!agregando.precio || agregando.guardando} onClick={confirmarAgregar}>
                  {agregando.guardando ? "Agregando…" : agregando.precio ? `Agregar ${esEbike ? "e-bike" : "moto"} · ${dinero(agregando.precio.total)}` : `Agregar ${esEbike ? "e-bike" : "moto"}`}
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

      {cobrando && (
        <CobroModal
          renta={cobrando.renta}
          grupo={cobrando.grupo}
          pendiente={cobrando.pendiente}
          nombreStaff={staffActual?.nombre}
          aviso={cobrando.luegoDevolver ? `A esta renta le falta cobrar ${dinero(cobrando.pendiente)} antes de marcarla devuelta.` : ""}
          onCerrar={() => setCobrando(null)}
          onCobrado={async () => {
            const { renta, luegoDevolver } = cobrando;
            setCobrando(null);
            await cargar();
            if (luegoDevolver) iniciarDevolucion(renta, { sinCobrar: true });
          }}
          accionSecundaria={
            cobrando.luegoDevolver
              ? {
                  texto: "Marcar devuelta sin cobrar",
                  onClick: () => {
                    const { renta } = cobrando;
                    setCobrando(null);
                    iniciarDevolucion(renta, { sinCobrar: true });
                  },
                }
              : undefined
          }
        />
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
