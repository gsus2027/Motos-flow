import { Resend } from "resend";
import { RESENAS, RUTA, consejosSeguridad } from "./contenidoExito";
import { calcularTarifa, calcularTarifaEbike } from "./pricing";
import { TEXTOS_CONTRATO, TEXTOS_CONTRATO_EBIKE } from "./textos";

function cliente() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Cambia esto por tu dirección real una vez que verifiques tu dominio en
// Resend.
const DESDE = "Flow Rentals <no-reply@theflowrentals.com>";

function formatoDia(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function estiloBoton(color, texto, href) {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#fff;padding:10px 18px;border-radius:20px;font-size:13.5px;text-decoration:none;margin:4px 6px 4px 0;">${texto}</a>`;
}

function bloqueEtiqueta(texto) {
  return `<p style="font-size:12.5px;color:#6E6E73;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">${texto}</p>`;
}

function seccionResenas(idioma) {
  const es = idioma !== "en";
  return `
    ${bloqueEtiqueta(es ? "Reseña" : "Review")}
    <p style="font-size:14px;margin:0 0 10px;">${es ? "¿Nos ayudas con una reseña?" : "Could you leave us a review?"}</p>
    <div style="margin:0 0 24px;">
      ${estiloBoton("#0071E3", "⭐ Google", RESENAS.google)}
      ${estiloBoton("#6E6E73", "📝 TripAdvisor", RESENAS.tripadvisor)}
    </div>`;
}

function seccionConsejosYRuta(idioma, tipoVehiculo) {
  const es = idioma !== "en";
  const lang = es ? "es" : "en";
  const consejos = consejosSeguridad(tipoVehiculo, lang);
  const ruta = RUTA[lang];
  return `
    ${bloqueEtiqueta(es ? "Antes de salir" : "Before you go")}
    <p style="font-weight:600;font-size:14px;margin:0 0 8px;">${es ? "Consejos de seguridad" : "Safety tips"}</p>
    <ul style="font-size:12.5px;color:#3a3a3c;line-height:1.6;margin:0 0 18px;padding-left:18px;">
      ${consejos.map((c) => `<li style="margin-bottom:4px;">${c}</li>`).join("")}
    </ul>
    <p style="font-weight:600;font-size:14px;margin:0 0 8px;">${es ? "Nuestra ruta recomendada" : "Our recommended route"}</p>
    <ol style="font-size:12.5px;color:#3a3a3c;line-height:1.7;margin:0 0 24px;padding-left:18px;">
      ${ruta.map((p) => `<li style="margin-bottom:8px;"><strong>${p.nombre}</strong> — ${p.texto} <a href="${p.mapsLink}" style="color:#0071E3;text-decoration:none;">📍 ${es ? "Ver en Google Maps" : "View on Google Maps"}</a></li>`).join("")}
    </ol>`;
}

function campoHtml(label, valor) {
  return `<span><strong>${label}</strong> ${valor || "—"}</span>`;
}

function seccionesLegales(t) {
  const bloque3 = t.s3items
    ? `<ul style="margin:0 0 8px;padding-left:18px;">${t.s3items.map((x) => `<li style="margin-bottom:3px;">${x}</li>`).join("")}</ul>`
    : `<p style="margin:0 0 8px;">${t.s3txt}</p>`;
  const bloque4 = t.s4items
    ? `<ul style="margin:0 0 8px;padding-left:18px;">${t.s4items.map((x) => `<li style="margin-bottom:3px;">${x}</li>`).join("")}</ul>`
    : `<p style="margin:0 0 8px;">${t.s4txt}</p>`;
  return `
    <p style="font-weight:600;margin:14px 0 4px;">${t.s2}</p>
    <p style="margin:0 0 4px;">${t.s2intro || ""}</p>
    <ul style="margin:0 0 8px;padding-left:18px;">${t.s2items.map((x) => `<li style="margin-bottom:3px;">${x}</li>`).join("")}</ul>
    <p style="font-weight:600;margin:14px 0 4px;">${t.s3}</p>
    ${bloque3}
    <p style="font-weight:600;margin:14px 0 4px;">${t.s4}</p>
    ${bloque4}
    <p style="font-weight:600;margin:14px 0 4px;">${t.s5}</p>
    <ul style="margin:0 0 8px;padding-left:18px;">${t.s5items.map((x) => `<li style="margin-bottom:3px;">${x}</li>`).join("")}</ul>
    <p style="font-weight:600;margin:14px 0 4px;">${t.s6}</p>
    <p style="margin:0;">${t.s6txt}</p>`;
}

function contratoHtmlMoto({ renta, moto, tarifas }) {
  const idioma = renta.idioma === "en" ? "en" : "es";
  const t = TEXTOS_CONTRATO[idioma];
  const resultado = calcularTarifa({
    tipoMoto: moto?.tipo,
    fechaEntrega: renta.fecha_entrega,
    horaEntrega: renta.hora_entrega,
    fechaPrevista: renta.fecha_prevista,
    tarifas,
  });
  const coberturaPrecio = Number(renta.cobertura_precio) || 0;
  const extrasTotal = (renta.extras || []).reduce((s, e) => s + (Number(e.precio) || 0), 0);
  const totalFinal = renta.tarifa_total != null ? Number(renta.tarifa_total) : resultado.total + coberturaPrecio + extrasTotal;
  const rentaBase = totalFinal - coberturaPrecio - extrasTotal;

  return `
    <p style="font-weight:700;text-align:center;font-size:15px;margin:0 0 2px;">${t.titulo}</p>
    <p style="text-align:center;font-size:11px;color:#777;margin:0 0 16px;">${t.contratoNo} ${(renta.id || "").slice(0, 8).toUpperCase()}</p>
    <p style="margin:0 0 4px;">${campoHtml(t.nombreCliente, renta.cliente)} &nbsp;&nbsp; ${campoHtml(t.pasaporte, renta.cedula)}</p>
    <p style="margin:0 0 4px;">${campoHtml(t.telefono, renta.telefono)} &nbsp;&nbsp; ${campoHtml(t.hotel, renta.hotel)}</p>
    <p style="margin:0 0 12px;">${campoHtml(t.correo, renta.correo)}</p>
    <p style="font-weight:600;margin:0 0 4px;">${t.s1}</p>
    <p style="margin:0 0 6px;">${t.s1txt}</p>
    <p style="margin:0 0 4px;">${campoHtml(t.marcaModelo, moto?.modelo)} &nbsp;&nbsp; ${campoHtml(t.placa, moto?.placa)}</p>
    <p style="margin:0 0 4px;">${campoHtml(t.fechaAlquiler, formatoDia(renta.fecha_entrega))} &nbsp;&nbsp; ${campoHtml(t.horaAlquiler, renta.hora_entrega)}</p>
    <p style="margin:0 0 8px;">${campoHtml(t.fechaDevolucion, formatoDia(renta.fecha_prevista))}</p>
    <p style="margin:0 0 2px;">${t.rentaBase}: $${rentaBase.toFixed(2)} ${t.usd}</p>
    ${coberturaPrecio > 0 ? `<p style="margin:0 0 2px;">${t.coberturaLinea}: $${coberturaPrecio.toFixed(2)} ${t.usd}</p>` : ""}
    ${(renta.extras || []).map((e) => `<p style="margin:0 0 2px;">${e.nombre}: $${Number(e.precio).toFixed(2)} ${t.usd}</p>`).join("")}
    <p style="font-weight:700;margin:6px 0 0;">${t.totalEstimado} $${totalFinal.toFixed(2)} ${t.usd}</p>
    ${seccionesLegales(t)}`;
}

function contratoHtmlEbike({ renta, ebike, tarifaDia }) {
  const idioma = renta.idioma === "en" ? "en" : "es";
  const t = TEXTOS_CONTRATO_EBIKE[idioma];
  const resultado = calcularTarifaEbike({ fechaEntrega: renta.fecha_entrega, fechaPrevista: renta.fecha_prevista, tarifaDia });
  const extrasTotal = (renta.extras || []).reduce((s, e) => s + (Number(e.precio) || 0), 0);
  const totalFinal = renta.tarifa_total != null ? Number(renta.tarifa_total) : resultado.total + extrasTotal;
  const rentaBase = totalFinal - extrasTotal;

  return `
    <p style="font-weight:700;text-align:center;font-size:15px;margin:0 0 2px;">${t.titulo}</p>
    <p style="text-align:center;font-size:11px;color:#777;margin:0 0 16px;">${t.contratoNo} ${(renta.id || "").slice(0, 8).toUpperCase()}</p>
    <p style="margin:0 0 4px;">${campoHtml(t.nombreCliente, renta.cliente)} &nbsp;&nbsp; ${campoHtml(t.pasaporte, renta.cedula)}</p>
    <p style="margin:0 0 4px;">${campoHtml(t.telefono, renta.telefono)} &nbsp;&nbsp; ${campoHtml(t.hotel, renta.hotel)}</p>
    <p style="margin:0 0 12px;">${campoHtml(t.correo, renta.correo)}</p>
    <p style="font-weight:600;margin:0 0 4px;">${t.s1}</p>
    <p style="margin:0 0 6px;">${t.s1txt}</p>
    <p style="margin:0 0 4px;">${campoHtml(t.numero, ebike?.numero ? `#${ebike.numero}` : "—")}</p>
    <p style="margin:0 0 8px;">${campoHtml(t.fechaAlquiler, formatoDia(renta.fecha_entrega))} &nbsp;&nbsp; ${campoHtml(t.fechaDevolucion, formatoDia(renta.fecha_prevista))}</p>
    <p style="margin:0 0 2px;">${t.rentaBase}: $${rentaBase.toFixed(2)} ${t.usd}</p>
    ${(renta.extras || []).map((e) => `<p style="margin:0 0 2px;">${e.nombre}: $${Number(e.precio).toFixed(2)} ${t.usd}</p>`).join("")}
    <p style="font-weight:700;margin:6px 0 0;">${t.totalEstimado} $${totalFinal.toFixed(2)} ${t.usd}</p>
    ${seccionesLegales(t)}`;
}

function plantillaBase({ cuerpoHtml }) {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #D2D2D7;border-radius:12px;overflow:hidden;">
    <div style="background:#0071E3;padding:20px 24px;text-align:center;">
      <span style="color:#fff;font-weight:600;font-size:18px;">Flow Rentals</span>
    </div>
    <div style="padding:24px;background:#fff;color:#1D1D1F;font-size:13px;line-height:1.55;">
      ${cuerpoHtml}
    </div>
  </div>`;
}

// Correo 1: se envía justo después de que el cliente firma su contrato.
// Orden: 1) reseñas, 2) consejos de seguridad + ruta, 3) contrato completo
// (todo dentro del cuerpo del correo — sin archivo adjunto, para no
// depender de generar PDFs en el servidor).
export async function enviarCorreoContratoFirmado({ paraCorreo, nombreCliente, idioma, tipoVehiculo, renta, moto, ebike, tarifas, tarifaDia }) {
  const resend = cliente();
  if (!resend || !paraCorreo) {
    console.log("[email] RESEND_API_KEY no configurada o falta correo — se omite el envío.");
    return;
  }
  const es = idioma !== "en";
  const asunto = es ? "Tu contrato de renta — Flow Rentals" : "Your rental agreement — Flow Rentals";

  const contratoHtml = tipoVehiculo === "ebike"
    ? contratoHtmlEbike({ renta, ebike, tarifaDia })
    : contratoHtmlMoto({ renta, moto, tarifas });

  const cuerpo = `
    <p style="font-size:14px;margin:0 0 20px;">${es ? "Hola" : "Hi"} ${nombreCliente || ""}, ${es ? "gracias por rentar con Flow Rentals." : "thanks for renting with Flow Rentals."}</p>
    ${seccionResenas(idioma)}
    ${seccionConsejosYRuta(idioma, tipoVehiculo)}
    ${bloqueEtiqueta(es ? "Tu contrato" : "Your agreement")}
    <div style="background:#F5F5F7;border-radius:10px;padding:18px;font-size:12px;">
      ${contratoHtml}
    </div>
  `;
  await resend.emails.send({
    from: DESDE,
    to: paraCorreo,
    subject: asunto,
    html: plantillaBase({ cuerpoHtml: cuerpo }),
  });
}

// Correo 2: se envía cuando el staff marca la renta como devuelta.
export async function enviarCorreoDevolucion({ paraCorreo, nombreCliente, idioma, tipoVehiculo }) {
  const resend = cliente();
  if (!resend || !paraCorreo) {
    console.log("[email] RESEND_API_KEY no configurada o falta correo — se omite el envío.");
    return;
  }
  const es = idioma !== "en";
  const vehiculo = tipoVehiculo === "ebike" ? (es ? "la ebike" : "the ebike") : (es ? "la moto" : "the moto");
  const asunto = es ? "¡Gracias por rentar con nosotros!" : "Thanks for renting with us!";
  const cuerpo = `
    <div style="text-align:center;">
      <div style="font-size:32px;margin-bottom:10px;">✅</div>
      <p style="font-weight:600;font-size:16px;margin:0 0 10px;">${es ? `¡Hemos recibido ${vehiculo}!` : `We've received ${vehiculo}!`}</p>
      <p style="font-size:14px;color:#6E6E73;line-height:1.6;margin:0 0 20px;">
        ${es
          ? `Gracias por rentar con Flow Rentals, ${nombreCliente || ""}. Esperamos que hayas disfrutado tu recorrido por Bocas del Toro.`
          : `Thanks for renting with Flow Rentals, ${nombreCliente || ""}. We hope you enjoyed your ride around Bocas del Toro.`}
      </p>
      <p style="font-size:14px;margin:0 0 12px;">${es ? "Nos ayudarías muchísimo calificando nuestro servicio:" : "We'd love it if you could rate us:"}</p>
      <div>${estiloBoton("#0071E3", es ? "⭐ Calificar en Google" : "⭐ Rate us on Google", RESENAS.google)}</div>
      <div style="margin-top:6px;">${estiloBoton("#6E6E73", "📝 TripAdvisor", RESENAS.tripadvisor)}</div>
    </div>
  `;
  await resend.emails.send({
    from: DESDE,
    to: paraCorreo,
    subject: asunto,
    html: plantillaBase({ cuerpoHtml: cuerpo }),
  });
}
