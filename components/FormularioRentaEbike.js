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
      <div className="card" style={{ maxWidth: 640, margin: "0 auto", padding: "40px 30px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
        <h2 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 20, margin: "0 0 10px" }}>{t.exitoTitulo}</h2>
        <p style={{ color: "#6B6255", fontSize: 14.5, margin: "0 0 22px" }}>{t.exitoTexto}</p>
        <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>{t.otraRenta}</button>
      </div>
    );
  }

  if (paso === "firma") {
    const rentaPreview = { ...form, id: "" };
    return (
      <div>
        <div className="card" style={{ padding: "34px 38px", maxWidth: 720, margin: "0 auto 18px", fontFamily: "Georgia, 'Times New Roman', serif", color: "#1a1a1a", lineHeight: 1.55, fontSize: 14, maxHeight: 460, overflowY: "auto" }}>
          <ContratoTextoEbike renta={rentaPreview} ebike={ebikeSeleccionada} t={tContrato} />
        </div>

        <div className="card" style={{ padding: 22, maxWidth: 720, margin: "0 auto" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} style={{ marginTop: 3 }} />
            <span>{t.acepto}</span>
          </label>

          <div style={{ marginTop: 18 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#6B6255", marginBottom: 8 }}>{t.firmarAqui}</label>
            <FirmaPad onChange={setFirma} limpiarTexto={t.limpiar} />
          </div>

          {error && (
            <div style={{ marginTop: 18, background: "#F6DEDA", color: "#8E2A1C", padding: 11, borderRadius: 4, fontSize: 13.5 }}>{error}</div>
          )}

          <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
            <button type="button" className="btn-secondary" onClick={() => setPaso("datos")}>{t.atras}</button>
            <button type="button" className="btn-primary" onClick={confirmarFirma} disabled={guardando}>
              {guardando ? t.guardando : t.confirmarFirma}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ padding: 26, maxWidth: 640, margin: "0 auto" }}>
        <div className="field" style={{ marginBottom: 18 }}>
          <label>{t.idiomaLabel}</label>
          <div style={{ display: "flex", gap: 10 }}>
            {[["es", "Español"], ["en", "English"]].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => set("idioma", val)}
                className={form.idioma === val ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 18px", fontSize: 13.5 }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!cargandoEbikes && ebikes.length === 0 && (
          <div style={{ background: "#FBEACB", color: "#8A5A03", padding: 14, borderRadius: 4, marginBottom: 20, fontSize: 14 }}>
            {t.faltanEbikes}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.nombreCliente} <span style={{ color: "#C0392B" }}>*</span></label>
            <input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder={t.nombrePlaceholder} />
          </div>
          <div className="field">
            <label>{t.cedula} <span style={{ color: "#C0392B" }}>*</span></label>
            <input value={form.cedula} onChange={(e) => set("cedula", e.target.value)} placeholder={t.cedulaPlaceholder} />
          </div>
          <div className="field">
            <label>{t.telefono} <span style={{ color: "#C0392B" }}>*</span></label>
            <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder={t.telefonoPlaceholder} />
          </div>
          <div className="field">
            <label>{t.hotel} <span style={{ color: "#C0392B" }}>*</span></label>
            <input value={form.hotel} onChange={(e) => set("hotel", e.target.value)} placeholder={t.hotelPlaceholder} />
          </div>
          <div className="field">
            <label>{t.pais}</label>
            <input value={form.pais} onChange={(e) => set("pais", e.target.value)} placeholder={t.paisPlaceholder} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.correo} <span style={{ color: "#C0392B" }}>*</span></label>
            <input type="email" value={form.correo} onChange={(e) => set("correo", e.target.value)} placeholder={t.correoPlaceholder} />
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.ebike}</label>
            <select value={form.ebikeId} onChange={(e) => set("ebikeId", e.target.value)}>
              <option value="">{t.ebikePlaceholder}</option>
              {ebikes.map((e) => (
                <option key={e.id} value={e.id}>Ebike {e.numero}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>{t.fechaEntrega}</label>
            <input type="date" value={form.fechaEntrega} onChange={(e) => set("fechaEntrega", e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.fechaPrevista}</label>
            <input type="date" value={form.fechaPrevista} onChange={(e) => set("fechaPrevista", e.target.value)} />
          </div>

          {resultadoTarifa && (
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>{t.tarifaCalculada}</label>
              <div style={{ background: "#F3EEE2", border: "1.5px solid #D8CFBC", borderRadius: 4, padding: "10px 14px" }}>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 20 }}>
                  ${resultadoTarifa.total.toFixed(2)} {tContrato.usd}
                </div>
              </div>
            </div>
          )}

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.notas}</label>
            <input value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder={t.notasPlaceholder} />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 18, background: "#F6DEDA", color: "#8E2A1C", padding: 11, borderRadius: 4, fontSize: 13.5 }}>{error}</div>
        )}

        <div style={{ marginTop: 22 }}>
          <button type="button" onClick={irAFirma} className="btn-primary">{t.continuar}</button>
        </div>
      </div>
    </div>
  );
}
