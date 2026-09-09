"use client";
import { TEXTOS_CONTRATO } from "@/lib/textos";
import ContratoTexto from "./ContratoTexto";
import ImagenPrivada from "./ImagenPrivada";

function formatoDia(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function ContratoModal({ renta, moto, onCerrar }) {
  const idioma = renta.idioma === "en" ? "en" : "es";
  const t = TEXTOS_CONTRATO[idioma];

  const rentaProps = {
    id: renta.id,
    cliente: renta.cliente,
    cedula: renta.cedula,
    telefono: renta.telefono,
    hotel: renta.hotel,
    correo: renta.correo,
    fechaEntrega: renta.fecha_entrega,
    horaEntrega: renta.hora_entrega,
    fechaPrevista: renta.fecha_prevista,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,18,15,.6)", zIndex: 40, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "26px 16px", overflowY: "auto" }}
    >
      <div style={{ background: "#fff", maxWidth: 720, width: "100%", borderRadius: 6, padding: "40px 44px 34px", fontFamily: "Georgia, 'Times New Roman', serif", color: "#1a1a1a", lineHeight: 1.55, fontSize: 14 }}>
        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 14 }}>
          <button className="btn-secondary" onClick={() => window.print()}>{t.imprimir}</button>
          <button className="btn-secondary" onClick={onCerrar}>Cerrar</button>
        </div>

        <ContratoTexto renta={rentaProps} moto={moto} t={t} />

        <div style={{ display: "flex", gap: 40, marginTop: 44, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            {renta.firma_cliente_url ? (
              <ImagenPrivada path={renta.firma_cliente_url} alt="Firma del cliente" style={{ height: 60, borderBottom: "1px solid #333" }} />
            ) : (
              <div style={{ borderTop: "1px solid #333", marginTop: 40 }} />
            )}
            <div style={{ paddingTop: 6, fontSize: 12.5 }}>{t.firmaCliente}</div>
            <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
              {renta.firma_cliente_url ? `${t.firmadoDigitalmente} ${formatoDia(renta.fecha_firma)}` : t.pendienteFirma}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ borderTop: "1px solid #333", marginTop: 40, paddingTop: 6, fontSize: 12.5 }}>{t.firmaRep}</div>
            <div style={{ borderTop: "1px solid #333", marginTop: 40, paddingTop: 6, fontSize: 12.5 }}>{t.fecha}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
