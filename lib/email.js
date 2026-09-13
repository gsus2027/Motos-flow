import { Resend } from "resend";
import { RESENAS } from "./contenidoExito";

// Si todavía no configuraste RESEND_API_KEY en Vercel, esto no falla el
// resto de la app — simplemente no se envía el correo (se registra en
// consola) hasta que la variable exista.
function cliente() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Cambia esto por tu dirección real una vez que verifiques tu dominio en
// Resend (paso 2 de la guía que te di). Mientras tanto, Resend permite
// enviar solo a tu propio correo de prueba desde su dominio de sandbox.
const DESDE = "Flow Rentals <no-reply@theflowrentals.com>";

function estiloBoton(color, texto, href) {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#fff;padding:10px 18px;border-radius:20px;font-size:13.5px;text-decoration:none;margin:4px 6px 4px 0;">${texto}</a>`;
}

function plantillaBase({ titulo, cuerpoHtml }) {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #D2D2D7;border-radius:12px;overflow:hidden;">
    <div style="background:#0071E3;padding:20px 24px;text-align:center;">
      <span style="color:#fff;font-weight:600;font-size:18px;">Flow Rentals</span>
    </div>
    <div style="padding:24px;background:#fff;color:#1D1D1F;">
      ${cuerpoHtml}
    </div>
  </div>`;
}

// Correo 1: se envía justo después de que el cliente firma su contrato.
// Incluye el PDF adjunto y el mismo contenido de seguridad/ruta/reseñas
// que ya ve en la pantalla de éxito.
export async function enviarCorreoContratoFirmado({ paraCorreo, nombreCliente, idioma, pdfBuffer, nombreArchivo }) {
  const resend = cliente();
  if (!resend || !paraCorreo) {
    console.log("[email] RESEND_API_KEY no configurada o falta correo — se omite el envío.");
    return;
  }
  const es = idioma !== "en";
  const asunto = es ? "Tu contrato de renta — Flow Rentals" : "Your rental agreement — Flow Rentals";
  const cuerpo = `
    <p style="font-size:14px;margin:0 0 14px;">${es ? "Hola" : "Hi"} ${nombreCliente || ""},</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 18px;">
      ${es
        ? "Gracias por rentar con Flow Rentals. Tu contrato firmado está adjunto a este correo en PDF."
        : "Thanks for renting with Flow Rentals. Your signed rental agreement is attached to this email as a PDF."}
    </p>
    <p style="font-size:14px;margin:20px 0 10px;">${es ? "¿Nos ayudas con una reseña?" : "Could you leave us a review?"}</p>
    <div>
      ${estiloBoton("#0071E3", es ? "⭐ Google" : "⭐ Google", RESENAS.google)}
      ${estiloBoton("#6E6E73", "📝 TripAdvisor", RESENAS.tripadvisor)}
    </div>
  `;
  await resend.emails.send({
    from: DESDE,
    to: paraCorreo,
    subject: asunto,
    html: plantillaBase({ cuerpoHtml: cuerpo }),
    attachments: pdfBuffer ? [{ filename: nombreArchivo || "contrato.pdf", content: pdfBuffer }] : [],
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
      <div>
        ${estiloBoton("#0071E3", es ? "⭐ Calificar en Google" : "⭐ Rate us on Google", RESENAS.google)}
      </div>
      <div style="margin-top:6px;">
        ${estiloBoton("#6E6E73", "📝 TripAdvisor", RESENAS.tripadvisor)}
      </div>
    </div>
  `;
  await resend.emails.send({
    from: DESDE,
    to: paraCorreo,
    subject: asunto,
    html: plantillaBase({ cuerpoHtml: cuerpo }),
  });
}
