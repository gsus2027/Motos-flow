import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";
import { rentasDelContrato } from "@/lib/contratoMultiple";

export const dynamic = "force-dynamic";

// GET /api/contrato?tipo=moto|ebike&id=<renta> — solo staff. Las rentas del
// mismo contrato (18-oct-2026, contrato con varios vehículos).
export async function GET(req) {
  if (!(await tokenValido(req.cookies.get(SESSION_COOKIE_NAME)?.value))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo") === "ebike" ? "ebike" : "moto";
  const id = url.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Falta el id." }, { status: 400 });
  const db = supabaseServer();
  const tabla = tipo === "ebike" ? "rentas_ebike" : "rentas";
  const { data: renta } = await db.from(tabla).select("id, contrato_id").eq("id", id).maybeSingle();
  if (!renta) return NextResponse.json({ rentas: [] });
  const rentas = await rentasDelContrato({ db, tipo, renta });
  return NextResponse.json({ rentas });
}
