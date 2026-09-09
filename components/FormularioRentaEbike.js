"use client";
import { useEffect, useState } from "react";
import { TEXTOS_FORM_EBIKE, TEXTOS_CONTRATO_EBIKE } from "@/lib/textos";
import { calcularTarifaEbike } from "@/lib/pricing";
import ContratoTextoEbike from "./ContratoTextoEbike";
import FirmaPad from "./FirmaPad";

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PasoStripEbike({ paso }) {
  const enFirma = paso === "firma";
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="v2-mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>
        {enFirma ? "PASO 2 · 2 — TÉRMINOS Y FIRMA" : "PASO 1 · 2 — DATOS Y VEHÍCULO"}
      </div>
      <div className="v2-step-strip">
        <div className="dash" style={{ background: "var(--ebike)" }} />
        <div className="dash" style={{ background: enFirma ? "var(--ebike)" : "var(--border)" }} />
      </div>
    </div>
  );
}

export default function FormularioRentaEbike({ onExito }) {
  const [ebikes, setEbikes] = useState([]);
  const [cargandoEbikes, setCargandoEbikes] = useState(true);
  const [paso, setPaso] = useState("datos");
  const [form, setForm] = useState({
    idioma: "es",
    cliente: "",
    cedula: "",
    telefono: "",
    hotel: "",
    pais: "",
    correo: "",
    ebikeId: "",
    fechaEntrega: hoyISO(),
    fechaPrevista: "",
    notas: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [firma, setFirma] = useState("");

  const t = TEXTOS_FORM_EBIKE[form.idioma === "en" ? "en" : "es"];
  const tContrato = TEXTOS_CONTRATO_EBIKE[form.idioma === "en" ? "en" : "es"];
  const ebikeSeleccionada = ebikes.find((e) => e.id === form.ebikeId);
  const resultadoTarifa = form.fechaPrevista
    ? calcularTarifaEbike({ fechaEntrega: form.fechaEntrega, fechaPrevista: form.fechaPrevista })
    : null;

  useEffect(() => {
    fetch("/api/ebikes?disponibles=1")
      .then((r) => r.json())
      .then((d) => {
        setEbikes(d.ebikes || []);
        setCargandoEbikes(false);
      })
      .catch(() => setCargandoEbikes(false));
  }, []);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function irAFirma() {
    setError("");
    if (!form.cliente.trim() || !form.cedula.trim()) return setError(t.errorNombreCedula);
    if (!form.telefono.trim()) return setError(t.errorTelefono);
    if (!form.hotel.trim()) return setError(t.errorHotel);
    if (!form.correo.trim()) return setError(t.errorCorreo);
    if (!form.ebikeId) return setError(t.errorEbike);
    if (!form.fechaPrevista) return setError(t.errorFecha);
    setPaso("firma");
  }

  async function confirmarFirma() {
    setError("");
    if (!acepto) return setError(t.errorAcepto);
    if (!firma) return setError(t.errorFirma);

    setGuardando(true);
    try {
      const subeFirma = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: firma, tipo: "firma" }),
      }).then((r) => r.json());
      if (subeFirma.error) throw new Error(subeFirma.error);

      const res = await fetch("/api/rentas-ebike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ebikeId: form.ebikeId,
          idioma: form.idioma,
          cliente: form.cliente,
          cedula: form.cedula,
          telefono: form.telefono,
          hotel: form.hotel,
          pais: form.pais,
          correo: form.correo,
          fechaEntrega: form.fechaEntrega,
          fechaPrevista: form.fechaPrevista,
          notas: form.notas,
          firmaClienteUrl: subeFirma.path,
          aceptoTerminos: true,
        }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);

      onExito ? onExito() : setPaso("exito");
    } catch (err) {
      setError(err.message || "No se pudo completar la renta. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (paso === "exito") {
    return (
      <div className="v2-card" style={{ maxWidth: 640, margin: "0 auto", padding: "40px 30px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
        <h2 className="v2-brand" style={{ fontSize: 20, margin: "0 0 10px", color: "var(--text)" }}>{t.exitoTitulo}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "0 0 22px" }}>{t.exitoTexto}</p>
        <button type="button" className="v2-btn-secondary" onClick={() => window.location.reload()}>{t.otraRenta}</button>
      </div>
    );
  }

  if (paso === "firma") {
    const rentaPreview = { ...form, id: "" };
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PasoStripEbike paso={paso} />
        <div className="card" style={{ padding: "34px 38px", marginBottom: 18, fontFamily: "Georgia, 'Times New Roman', serif", color: "#1a1a1a", lineHeight: 1.55, fontSize: 14, maxHeight: 460, overflowY: "auto" }}>
          <ContratoTextoEbike renta={rentaPreview} ebike={ebikeSeleccionada} t={tContrato} />
        </div>

        <div className="v2-card" style={{ padding: 22 }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, cursor: "pointer", color: "var(--text)" }}>
            <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} style={{ marginTop: 3 }} />
            <span>{t.acepto}</span>
          </label>

          <div style={{ marginTop: 18 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>{t.firmarAqui}</label>
            <FirmaPad onChange={setFirma} limpiarTexto={t.limpiar} />
          </div>

          {error && <div className="v2-error">{error}</div>}

          <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
            <button type="button" className="v2-btn-secondary" onClick={() => setPaso("datos")}>{t.atras}</button>
            <button type="button" className="v2-btn-primary" style={{ background: "var(--ebike)", color: "var(--ebike-ink)" }} onClick={confirmarFirma} disabled={guardando}>
              {guardando ? t.guardando : t.confirmarFirma}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="v2-card" style={{ padding: 26 }}>
        <PasoStripEbike paso={paso} />

        <div className="v2-field" style={{ marginBottom: 18 }}>
          <label>{t.idiomaLabel}</label>
          <div style={{ display: "flex", gap: 10 }}>
            {[["es", "Español"], ["en", "English"]].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => set("idioma", val)}
                className={form.idioma === val ? "v2-btn-primary" : "v2-btn-secondary"}
                style={form.idioma === val ? { padding: "8px 18px", fontSize: 13.5, background: "var(--ebike)", color: "var(--ebike-ink)" } : { padding: "8px 18px", fontSize: 13.5 }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!cargandoEbikes && ebikes.length === 0 && (
          <div className="v2-error" style={{ marginTop: 0 }}>{t.faltanEbikes}</div>
        )}

        <div className="v2-section-label first" style={{ color: "var(--ebike)" }}>Cliente</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="v2-field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.nombreCliente} <span className="v2-required">*</span></label>
            <input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder={t.nombrePlaceholder} />
          </div>
          <div className="v2-field">
            <label>{t.cedula} <span className="v2-required">*</span></label>
            <input value={form.cedula} onChange={(e) => set("cedula", e.target.value)} placeholder={t.cedulaPlaceholder} />
          </div>
          <div className="v2-field">
            <label>{t.telefono} <span className="v2-required">*</span></label>
            <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder={t.telefonoPlaceholder} />
          </div>
          <div className="v2-field">
            <label>{t.hotel} <span className="v2-required">*</span></label>
            <input value={form.hotel} onChange={(e) => set("hotel", e.target.value)} placeholder={t.hotelPlaceholder} />
          </div>
          <div className="v2-field">
            <label>{t.pais}</label>
            <input value={form.pais} onChange={(e) => set("pais", e.target.value)} placeholder={t.paisPlaceholder} />
          </div>
          <div className="v2-field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.correo} <span className="v2-required">*</span></label>
            <input type="email" value={form.correo} onChange={(e) => set("correo", e.target.value)} placeholder={t.correoPlaceholder} />
          </div>
        </div>

        <div className="v2-section-label" style={{ color: "var(--ebike)" }}>Vehículo</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <div className="v2-field">
            <label>{t.ebike}</label>
            <select value={form.ebikeId} onChange={(e) => set("ebikeId", e.target.value)}>
              <option value="">{t.ebikePlaceholder}</option>
              {ebikes.map((e) => (
                <option key={e.id} value={e.id}>Ebike {e.numero}</option>
              ))}
            </select>
          </div>
          {ebikeSeleccionada && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Unidad</span>
              <span className="v2-plate" style={{ borderColor: "var(--ebike)", color: "var(--ebike)" }}>Ebike {ebikeSeleccionada.numero}</span>
            </div>
          )}
        </div>

        <div className="v2-section-label" style={{ color: "var(--ebike)" }}>Entrega y devolución</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="v2-field">
            <label>{t.fechaEntrega}</label>
            <input type="date" value={form.fechaEntrega} onChange={(e) => set("fechaEntrega", e.target.value)} />
          </div>
          <div className="v2-field">
            <label>{t.fechaPrevista}</label>
            <input type="date" value={form.fechaPrevista} onChange={(e) => set("fechaPrevista", e.target.value)} />
          </div>

          {resultadoTarifa && (
            <div className="v2-field" style={{ gridColumn: "1 / -1" }}>
              <label>{t.tarifaCalculada}</label>
              <div style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
                <div className="v2-brand" style={{ fontSize: 20, color: "var(--ebike)" }}>
                  ${resultadoTarifa.total.toFixed(2)} {tContrato.usd}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="v2-section-label" style={{ color: "var(--ebike)" }}>Detalles</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <div className="v2-field">
            <label>{t.notas}</label>
            <input value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder={t.notasPlaceholder} />
          </div>
        </div>

        {error && <div className="v2-error">{error}</div>}

        <div style={{ marginTop: 22 }}>
          <button type="button" onClick={irAFirma} className="v2-btn-primary" style={{ width: "100%", background: "var(--ebike)", color: "var(--ebike-ink)" }}>{t.continuar} →</button>
        </div>
      </div>
    </div>
  );
}
