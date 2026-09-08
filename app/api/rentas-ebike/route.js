import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { calcularTarifaEbike } from "@/lib/pricing";

function requiereStaff(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return tokenValido(token);
}

// GET: solo staff — trae las rentas de ebike con datos del cliente
export async function GET(req) {
  if (!requiereStaff(req)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = supabaseServer();
  const { data, error } = await db
    .from("rentas_ebike")
    .select("*, ebikes(numero)")
    .order("fecha_prevista", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rentas: data });
}

// POST: pública — el cliente registra su propia renta desde /rentar-ebike
export async function POST(req) {
  const body = await req.json();
  const {
    ebikeId, idioma, cliente, cedula, telefono, hotel, pais, correo,
    fechaEntrega, fechaPrevista, notas,
    fotoCarnetUrl, firmaClienteUrl, aceptoTerminos,
  } = body;

  if (!cliente?.trim() || !cedula?.trim()) {
    return NextResponse.json({ error: "El nombre y la cédula del cliente son obligatorios." }, { status: 400 });
  }
  if (!ebikeId) return NextResponse.json({ error: "Selecciona una ebike disponible." }, { status: 400 });
  if (!fechaEntrega || !fechaPrevista) {
    return NextResponse.json({ error: "Faltan la fecha de entrega o la fecha de devolución." }, { status: 400 });
  }
  if (!fotoCarnetUrl) return NextResponse.json({ error: "Falta la foto del carnet." }, { status: 400 });
  if (!aceptoTerminos || !firmaClienteUrl) {
    return NextResponse.json({ error: "Falta aceptar los términos y firmar." }, { status: 400 });
  }

  const db = supabaseServer();

  const { data: activa } = await db
    .from("rentas_ebike")
    .select("id")
    .eq("ebike_id", ebikeId)
    .eq("estado", "activa")
    .maybeSingle();
  if (activa) {
    return NextResponse.json({ error: "Esa ebike ya no está disponible, elige otra." }, { status: 409 });
  }

  const resultado = calcularTarifaEbike({ fechaEntrega, fechaPrevista });

  const { data, error } = await db
    .from("rentas_ebike")
    .insert({
      ebike_id: ebikeId,
      idioma: idioma === "en" ? "en" : "es",
      cliente: cliente.trim(),
      cedula: cedula.trim(),
      telefono: telefono?.trim() || null,
      hotel: hotel?.trim() || null,
      pais: pais?.trim() || null,
      correo: correo?.trim() || null,
      fecha_entrega: fechaEntrega,
      fecha_prevista: fechaPrevista,
      notas: notas?.trim() || null,
      foto_carnet_url: fotoCarnetUrl,
      firma_cliente_url: firmaClienteUrl,
      fecha_firma: new Date().toISOString().slice(0, 10),
      acepto_terminos: true,
      tarifa_total: resultado.total,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ renta: data, tarifa: resultado });
}

// PATCH: solo staff — marcar una renta de ebike como devuelta
export async function PATCH(req) {
  if (!requiereStaff(req)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta el id de la renta." }, { status: 400 });

  const db = supabaseServer();
  const { data, error } = await db
    .from("rentas_ebike")
    .update({ estado: "devuelta", fecha_devolucion_real: new Date().toISOString().slice(0, 10) })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ renta: data });
}
