import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { limitadorEscritura, ipDelRequest, verificarLimite } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

function requiereStaff(req) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return tokenValido(token);
}

// GET: solo staff.
//  - /api/posiciones                 -> última posición conocida de cada moto (para el mapa)
//  - /api/posiciones?motoId=<uuid>   -> historial completo de esa moto (para dibujar la ruta)
export async function GET(req) {
  if (!(await requiereStaff(req))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = supabaseServer();
  const url = new URL(req.url);
  const motoId = url.searchParams.get("motoId");

  if (motoId) {
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");
    let query = db
      .from("posiciones")
      .select("id, moto_id, lat, lon, precision_m, fuente, capturado_en, recibido_en")
      .eq("moto_id", motoId)
      .order("capturado_en", { ascending: true })
      .limit(5000);
    if (desde) query = query.gte("capturado_en", desde);
    if (hasta) query = query.lte("capturado_en", hasta);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ posiciones: data });
  }

  // Última posición de cada moto: traemos las últimas ~500 filas (de
  // sobra para una flota chica) y nos quedamos con la primera que
  // veamos por moto, ya que vienen ordenadas de más reciente a más
  // vieja. Si la flota crece mucho, esto se puede cambiar por una vista
  // SQL con "distinct on (moto_id)" en vez de filtrar en JavaScript.
  const { data, error } = await db
    .from("posiciones")
    .select("id, moto_id, lat, lon, precision_m, fuente, capturado_en")
    .order("capturado_en", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ultimasPorMoto = new Map();
  for (const p of data) {
    if (!ultimasPorMoto.has(p.moto_id)) ultimasPorMoto.set(p.moto_id, p);
  }
  return NextResponse.json({ ultimas: Array.from(ultimasPorMoto.values()) });
}

// POST: solo staff — registrar una posición (desde el formulario manual,
// o desde cualquier script/automatización que mande el mismo JSON con la
// cookie de sesión, o adaptando este endpoint a una API key si se llama
// desde fuera del navegador — ver docs/rastreo-tags.md).
export async function POST(req) {
  if (!(await requiereStaff(req))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { exito } = await verificarLimite(limitadorEscritura, ipDelRequest(req));
  if (!exito) return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });

  const { motoId, tagId, lat, lon, precisionM, fuente, capturadoEn } = await req.json();
  if (typeof lat !== "number" || typeof lon !== "number") {
    return NextResponse.json({ error: "Latitud y longitud deben ser números." }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Latitud/longitud fuera de rango." }, { status: 400 });
  }
  if (!motoId && !tagId) {
    return NextResponse.json({ error: "Indica motoId o tagId." }, { status: 400 });
  }

  const db = supabaseServer();
  let idMoto = motoId;
  if (!idMoto) {
    const { data: moto, error: errMoto } = await db.from("motos").select("id").eq("tag_id", tagId).maybeSingle();
    if (errMoto) return NextResponse.json({ error: errMoto.message }, { status: 500 });
    if (!moto) return NextResponse.json({ error: `No existe ninguna moto con tag_id="${tagId}".` }, { status: 404 });
    idMoto = moto.id;
  }

  const { data, error } = await db
    .from("posiciones")
    .insert({
      moto_id: idMoto,
      lat,
      lon,
      precision_m: typeof precisionM === "number" ? precisionM : null,
      fuente: fuente?.trim() || "manual",
      capturado_en: capturadoEn || new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posicion: data });
}
