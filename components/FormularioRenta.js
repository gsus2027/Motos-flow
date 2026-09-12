"use client";
import { useEffect, useRef, useState } from "react";
import { TEXTOS_FORM, TEXTOS_CONTRATO } from "@/lib/textos";
import { calcularTarifa, calcularExtras } from "@/lib/pricing";
import { comprimirImagen } from "@/lib/imagen";
import ContratoTexto from "./ContratoTexto";
import FirmaPad from "./FirmaPad";
import SelectorHora from "./SelectorHora";
import PantallaExito from "./PantallaExito";

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function FormularioRenta({ onExito }) {
  const [motos, setMotos] = useState([]);
  const [cargandoMotos, setCargandoMotos] = useState(true);
  const [tarifas, setTarifas] = useState(null);
  const [configExtras, setConfigExtras] = useState(null);
  const [cobertura, setCobertura] = useState("basica");
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [paso, setPaso] = useState("datos");
  const [form, setForm] = useState({
    idioma: "es",
    cliente: "",
    cedula: "",
    telefono: "",
    hotel: "",
    pais: "",
    correo: "",
    motoId: "",
    fechaEntrega: hoyISO(),
    horaEntrega: "09:00",
    fechaPrevista: "",
    notas: "",
  });
  const [foto, setFoto] = useState(null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [firma, setFirma] = useState("");
  const fileRef = useRef(null);
  const camaraRef = useRef(null);

  const t = TEXTOS_FORM[form.idioma === "en" ? "en" : "es"];
  const tContrato = TEXTOS_CONTRATO[form.idioma === "en" ? "en" : "es"];
  const motoSeleccionada = motos.find((m) => m.id === form.motoId);
  const resultadoTarifa = form.motoId && tarifas
    ? calcularTarifa({
        tipoMoto: motoSeleccionada?.tipo,
        fechaEntrega: form.fechaEntrega,
        horaEntrega: form.horaEntrega,
        fechaPrevista: form.fechaPrevista,
        tarifas,
      })
    : null;
  const coberturaPrecio = cobertura === "premium" ? Number(configExtras?.coberturaPremium ?? 10) : 0;
  const { total: extrasTotal, detalle: extrasDetalle } = calcularExtras(extrasSeleccionados, configExtras, "moto");
  const totalConExtras = resultadoTarifa ? resultadoTarifa.total + coberturaPrecio + extrasTotal : null;

  function alternarExtra(id) {
    setExtrasSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  useEffect(() => {
    fetch("/api/motos?disponibles=1")
      .then((r) => r.json())
      .then((d) => {
        setMotos(d.motos || []);
        setCargandoMotos(false);
      })
      .catch(() => setCargandoMotos(false));
    fetch("/api/precios")
      .then((r) => r.json())
      .then((d) => setTarifas(d.tarifas))
      .catch(() => {});
    fetch("/api/extras")
      .then((r) => r.json())
      .then((d) => setConfigExtras(d))
      .catch(() => {});
  }, []);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function manejarArchivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setProcesandoFoto(true);
    try {
      const dataUrl = await comprimirImagen(file);
      setFoto(dataUrl);
    } catch {
      setError(t.errorFoto);
    } finally {
      setProcesandoFoto(false);
    }
  }

  function irAFirma() {
    setError("");
    if (!form.cliente.trim() || !form.cedula.trim()) return setError(t.errorNombreCedula);
    if (!form.telefono.trim()) return setError(t.errorTelefono);
    if (!form.hotel.trim()) return setError(t.errorHotel);
    if (!form.correo.trim()) return setError(t.errorCorreo);
    if (!form.motoId) return setError(t.errorMoto);
    if (!form.horaEntrega) return setError(t.errorHora);
    if (!form.fechaPrevista) return setError(t.errorFecha);
    if (!foto) return setError(t.errorFoto);
    setPaso("firma");
  }

  async function confirmarFirma() {
    setError("");
    if (!acepto) return setError(t.errorAcepto);
    if (!firma) return setError(t.errorFirma);

    setGuardando(true);
    try {
      const subeFoto = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: foto, tipo: "carnet" }),
      }).then((r) => r.json());
      if (subeFoto.error) throw new Error(subeFoto.error);

      const subeFirma = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: firma, tipo: "firma" }),
      }).then((r) => r.json());
      if (subeFirma.error) throw new Error(subeFirma.error);

      const res = await fetch("/api/rentas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motoId: form.motoId,
          idioma: form.idioma,
          cliente: form.cliente,
          cedula: form.cedula,
          telefono: form.telefono,
          hotel: form.hotel,
          pais: form.pais,
          correo: form.correo,
          fechaEntrega: form.fechaEntrega,
          horaEntrega: form.horaEntrega,
          fechaPrevista: form.fechaPrevista,
          notas: form.notas,
          fotoCarnetUrl: subeFoto.path,
          firmaClienteUrl: subeFirma.path,
          aceptoTerminos: true,
          cobertura,
          extrasSeleccionados,
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

  const motosLibres = motos;

  if (paso === "exito") {
    return (
      <PantallaExito
        idioma={form.idioma}
        tipo="moto"
        tituloExito={t.exitoTitulo}
        textoExito={t.exitoTexto}
        otraRentaLabel={t.otraRenta}
        onOtraRenta={() => window.location.reload()}
      />
    );
  }

  if (paso === "firma") {
    const rentaPreview = { ...form, id: "" };
    return (
      <div>
        <div className="card" style={{ padding: 26, maxWidth: 720, margin: "0 auto 18px" }}>
          <div className="paso-barra">
            <div className="paso-barra-seg activo" />
            <div className="paso-barra-seg activo" />
          </div>
          <div className="seccion-titulo">{t.pasoFirma}</div>
        </div>

        <div className="card" style={{ padding: "34px 38px", maxWidth: 720, margin: "0 auto 18px", fontFamily: "Georgia, 'Times New Roman', serif", background: "var(--paper-bg)", color: "var(--paper-text)", lineHeight: 1.55, fontSize: 14, maxHeight: 460, overflowY: "auto" }}>
          <ContratoTexto renta={rentaPreview} moto={motoSeleccionada} t={tContrato} />
        </div>

        <div className="card" style={{ padding: 22, maxWidth: 720, margin: "0 auto" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} style={{ marginTop: 3 }} />
            <span>{t.acepto}</span>
          </label>

          <div style={{ marginTop: 18 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>{t.firmarAqui}</label>
            <FirmaPad onChange={setFirma} limpiarTexto={t.limpiar} />
          </div>

          {error && (
            <div style={{ marginTop: 18, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 11, borderRadius: 10, fontSize: 13.5 }}>{error}</div>
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
        <div className="paso-barra">
          <div className="paso-barra-seg activo" />
          <div className="paso-barra-seg" />
        </div>
        <div className="seccion-titulo">{t.pasoDatos}</div>

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

        {!cargandoMotos && motosLibres.length === 0 && (
          <div style={{ background: "var(--warning-bg)", color: "var(--warning-text)", padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
            {t.faltanMotos}
          </div>
        )}

        <div className="seccion-titulo" style={{ marginTop: 4 }}>{t.seccionCliente}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.nombreCliente} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder={t.nombrePlaceholder} />
          </div>
          <div className="field">
            <label>{t.cedula} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input value={form.cedula} onChange={(e) => set("cedula", e.target.value)} placeholder={t.cedulaPlaceholder} />
          </div>
          <div className="field">
            <label>{t.telefono} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder={t.telefonoPlaceholder} />
          </div>
          <div className="field">
            <label>{t.hotel} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input value={form.hotel} onChange={(e) => set("hotel", e.target.value)} placeholder={t.hotelPlaceholder} />
          </div>
          <div className="field">
            <label>{t.pais}</label>
            <input value={form.pais} onChange={(e) => set("pais", e.target.value)} placeholder={t.paisPlaceholder} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.correo} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input type="email" value={form.correo} onChange={(e) => set("correo", e.target.value)} placeholder={t.correoPlaceholder} />
          </div>
        </div>

        <hr className="seccion-divisor" />
        <div className="seccion-titulo">{t.seccionVehiculo}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.moto}</label>
            <select value={form.motoId} onChange={(e) => set("motoId", e.target.value)}>
              <option value="">{t.motoPlaceholder}</option>
              {motosLibres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.placa} — {m.modelo} ({m.tipo === "scooter" ? "Scooter" : "Honda Navi"})
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{form.idioma === "en" ? "Coverage" : "Cobertura"}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              {[
                {
                  val: "basica",
                  titulo: form.idioma === "en" ? "Basic coverage — included" : "Cobertura básica — incluida",
                  texto: form.idioma === "en" ? "Up to $2,500 third-party damage, plus cleaning." : "Hasta $2,500 en daños a terceros, más limpieza.",
                },
                {
                  val: "premium",
                  titulo: form.idioma === "en" ? `Premium coverage +$${Number(configExtras?.coberturaPremium ?? 10).toFixed(2)}` : `Cobertura premium +$${Number(configExtras?.coberturaPremium ?? 10).toFixed(2)}`,
                  texto: form.idioma === "en"
                    ? "Also covers tires, plastics, engine/transmission, breakdown costs, towing, and lost keys."
                    : "Cubre además llantas, plásticos, motor/transmisión, averías, grúa y llaves perdidas.",
                },
              ].map((op) => (
                <div
                  key={op.val}
                  onClick={() => setCobertura(op.val)}
                  style={{
                    width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: 12,
                    border: cobertura === op.val ? "1.5px solid var(--amber)" : "1px solid var(--border)",
                    borderRadius: 10, cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <input type="radio" name="cobertura" readOnly checked={cobertura === op.val} style={{ marginTop: 3, marginRight: 10, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflowWrap: "break-word" }}>{op.titulo}</div>
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2, overflowWrap: "break-word" }}>{op.texto}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {configExtras?.extras?.length > 0 && (
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>{form.idioma === "en" ? "Want to add an extra?" : "¿Quieres agregar un extra?"}</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                {configExtras.extras.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => alternarExtra(ex.id)}
                    style={{
                      width: "100%", maxWidth: "100%", boxSizing: "border-box",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, minWidth: 0, overflowWrap: "break-word" }}>
                      <input type="checkbox" readOnly checked={extrasSeleccionados.includes(ex.id)} style={{ flexShrink: 0 }} />
                      <span>{ex.notaMoto || ex.nombre}</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: "var(--text-muted)", flexShrink: 0, marginLeft: 10 }}>${Number(ex.precioMoto).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <hr className="seccion-divisor" />
        <div className="seccion-titulo">{t.seccionEntrega}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.fechaEntrega}</label>
            <input type="date" value={form.fechaEntrega} onChange={(e) => set("fechaEntrega", e.target.value)} style={{ maxWidth: 220 }} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.horaEntrega}</label>
            <div style={{ maxWidth: 220 }}>
              <SelectorHora value={form.horaEntrega} onChange={(v) => set("horaEntrega", v)} />
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>{t.horaEntregaAyuda}</div>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.fechaPrevista}</label>
            <input type="date" value={form.fechaPrevista} onChange={(e) => set("fechaPrevista", e.target.value)} style={{ maxWidth: 220 }} />
          </div>

          {motoSeleccionada && resultadoTarifa && (
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>{t.tarifaCalculada}</label>
              <div style={{ background: "var(--highlight-bg)", border: "1.5px solid var(--highlight-border)", borderRadius: 10, padding: "12px 16px" }}>
                {(coberturaPrecio > 0 || extrasTotal > 0) && (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
                    {(form.idioma === "en" ? "Rental" : "Renta")}: ${resultadoTarifa.total.toFixed(2)}
                    {coberturaPrecio > 0 && <> · {form.idioma === "en" ? "Coverage" : "Cobertura"}: ${coberturaPrecio.toFixed(2)}</>}
                    {extrasTotal > 0 && <> · {form.idioma === "en" ? "Extras" : "Extras"}: ${extrasTotal.toFixed(2)}</>}
                  </div>
                )}
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 22, color: "var(--highlight-text)" }}>
                  ${totalConExtras.toFixed(2)} {tContrato.usd}
                </div>
              </div>
            </div>
          )}

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{t.notas}</label>
            <input value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder={t.notasPlaceholder} />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>{t.fotoLabel}</label>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {foto ? (
              <img src={foto} alt="Carnet subido" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: 8, background: "var(--panel-2)", border: "1px dashed var(--border-strong)" }} />
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={manejarArchivo} style={{ display: "none" }} />
              <input ref={camaraRef} type="file" accept="image/*" capture="environment" onChange={manejarArchivo} style={{ display: "none" }} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
                  {foto ? t.cambiarFoto : t.subirFoto}
                </button>
                <button type="button" className="btn-secondary" onClick={() => camaraRef.current?.click()}>
                  📷 {t.tomarFoto}
                </button>
              </div>
              {procesandoFoto && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>{t.procesandoImagen}</div>}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 18, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 11, borderRadius: 10, fontSize: 13.5 }}>{error}</div>
        )}

        <div style={{ marginTop: 22 }}>
          <button type="button" onClick={irAFirma} className="btn-primary">{t.continuar}</button>
        </div>
      </div>
    </div>
  );
}
