import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { calcularTarifa, calcularExtras, fechaHoyPanama } from "@/lib/pricing";
import { limitadorEscritura, ipDelRequest, verificarLimite } from "@/lib/ratelimit";
import { enviarCorreoContratoFirmado, enviarCorreoDevolucion } from "@/lib/email";
import { generarPdfContratoMoto } from "@/lib/contratoPdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function requiereStaff(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return tokenValido(token);
}

// GET: solo staff — trae las rentas con datos del cliente
export async function GET(req) {
  if (!(await requiereStaff(req))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = supabaseServer();
  const { data, error } = await db
    .from("rentas")
    .select("*, motos(placa, modelo, tipo)")
    .order("fecha_prevista", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rentas: data });
}

// POST: pública — el cliente registra su propia renta desde /rentar
export async function POST(req) {
  const { exito } = await verificarLimite(limitadorEscritura, ipDelRequest(req));
  if (!exito) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." }, { status: 429 });
  }

  const body = await req.json();
  const {
    motoId, idioma, cliente, cedula, telefono, hotel, pais, correo,
    fechaEntrega, horaEntrega, fechaPrevista, notas,
    fotoCarnetUrl, firmaClienteUrl, aceptoTerminos,
    cobertura, extrasSeleccionados, atendioClienteId,
  } = body;

  if (!cliente?.trim() || !cedula?.trim()) {
    return NextResponse.json({ error: "El nombre y la cédula del cliente son obligatorios." }, { status: 400 });
  }
  if (!telefono?.trim()) return NextResponse.json({ error: "El teléfono es obligatorio." }, { status: 400 });
  if (!hotel?.trim()) return NextResponse.json({ error: "El lugar de estadía es obligatorio." }, { status: 400 });
  if (!correo?.trim()) return NextResponse.json({ error: "El correo electrónico es obligatorio." }, { status: 400 });
  if (!motoId) return NextResponse.json({ error: "Selecciona una moto disponible." }, { status: 400 });
  if (!fechaEntrega || !horaEntrega || !fechaPrevista) {
    return NextResponse.json({ error: "Faltan la fecha/hora de entrega o la fecha de devolución." }, { status: 400 });
  }
  if (!fotoCarnetUrl) return NextResponse.json({ error: "Falta la foto del carnet." }, { status: 400 });
  if (!aceptoTerminos || !firmaClienteUrl) {
    return NextResponse.json({ error: "Falta aceptar los términos y firmar." }, { status: 400 });
  }

  const db = supabaseServer();

  // Confirmar que la moto sigue disponible (evita doble-renta por carrera)
  const { data: activa } = await db
    .from("rentas")
    .select("id")
    .eq("moto_id", motoId)
    .eq("estado", "activa")
    .maybeSingle();
  if (activa) {
    return NextResponse.json({ error: "Esa moto ya no está disponible, elige otra." }, { status: 409 });
  }

  const { data: moto } = await db.from("motos").select("tipo").eq("id", motoId).maybeSingle();
  const { data: configTarifas } = await db.from("configuracion").select("valor").eq("clave", "tarifas").maybeSingle();
  let tarifas;
  try {
    tarifas = configTarifas?.valor ? JSON.parse(configTarifas.valor) : undefined;
  } catch {
    tarifas = undefined;
  }
  const resultado = calcularTarifa({
    tipoMoto: moto?.tipo,
    fechaEntrega,
    horaEntrega,
    fechaPrevista,
    tarifas,
  });

  const { data: configExtras } = await db.from("configuracion").select("valor").eq("clave", "extras_coberturas").maybeSingle();
  let cfgExtras;
  try {
    cfgExtras = configExtras?.valor ? JSON.parse(configExtras.valor) : undefined;
  } catch {
    cfgExtras = undefined;
  }
  const coberturaEsPremium = cobertura === "premium";
  const coberturaPrecio = coberturaEsPremium ? Math.round(Number(cfgExtras?.coberturaPremium ?? 10) * resultado.dias * 100) / 100 : 0;
  const { total: extrasTotal, detalle: extrasDetalle } = calcularExtras(extrasSeleccionados, cfgExtras, "moto", resultado.dias);
  const totalFinal = resultado.total + coberturaPrecio + extrasTotal;

  // Quién atendió: lo elige el propio cliente en el formulario (obligatorio
  // ahí). Se valida que ese id exista y esté activo, nunca se confía en el
  // texto tal cual.
  let atendidoPor = null;
  if (atendioClienteId) {
    const { data: staffElegido } = await db.from("staff").select("nombre").eq("id", atendioClienteId).eq("activo", true).maybeSingle();
    atendidoPor = staffElegido?.nombre || null;
  }

  const { data, error } = await db
    .from("rentas")
    .insert({
      moto_id: motoId,
      idioma: idioma === "en" ? "en" : "es",
      cliente: cliente.trim(),
      cedula: cedula.trim(),
      telefono: telefono?.trim() || null,
      hotel: hotel?.trim() || null,
      pais: pais?.trim() || null,
      correo: correo?.trim() || null,
      fecha_entrega: fechaEntrega,
      hora_entrega: horaEntrega,
      fecha_prevista: fechaPrevista,
      notas: notas?.trim() || null,
      foto_carnet_url: fotoCarnetUrl,
      firma_cliente_url: firmaClienteUrl,
      fecha_firma: fechaHoyPanama(),
      acepto_terminos: true,
      tarifa_total: totalFinal,
      tarifa_regla: resultado.regla,
      cobertura: coberturaEsPremium ? "premium" : "basica",
      cobertura_precio: coberturaPrecio,
      extras: extrasDetalle,
      atendido_por: atendidoPor,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // El correo nunca debe tumbar la creación de la renta — si falla el
  // envío (o Resend no está configurado todavía), solo se registra en
  // consola y la renta queda guardada de todas formas.
  try {
    const pdfBuffer = await generarPdfContratoMoto({ renta: data, moto, tarifas });
    await enviarCorreoContratoFirmado({
      paraCorreo: data.correo,
      nombreCliente: data.cliente,
      idioma: data.idioma,
      pdfBuffer,
      nombreArchivo: `contrato-${(data.id || "").slice(0, 8)}.pdf`,
    });
  } catch (err) {
    console.error("[email] No se pudo enviar el correo de contrato:", err);
  }

  return NextResponse.json({ renta: data, tarifa: { ...resultado, total: totalFinal, coberturaPrecio, extrasTotal } });
}

// PATCH: solo staff — marcar una renta como devuelta (y, si tenía
// extras, guardar cuáles se devolvieron)
export async function PATCH(req) {
  if (!(await requiereStaff(req))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id, extras } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta el id de la renta." }, { status: 400 });

  const db = supabaseServer();
  const actualizacion = { estado: "devuelta", fecha_devolucion_real: fechaHoyPanama() };
  if (Array.isArray(extras)) {
    actualizacion.extras = extras.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      precio: e.precio,
      devuelto: e.devuelto === true,
    }));
  }
  const { data, error } = await db
    .from("rentas")
    .update(actualizacion)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await enviarCorreoDevolucion({
      paraCorreo: data.correo,
      nombreCliente: data.cliente,
      idioma: data.idioma,
      tipoVehiculo: "moto",
    });
  } catch (err) {
    console.error("[email] No se pudo enviar el correo de devolución:", err);
  }

  return NextResponse.json({ renta: data });
}
