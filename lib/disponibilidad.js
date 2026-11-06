import { fechaHoyPanama } from "@/lib/pricing";

// Disponibilidad de motos y ebikes POR FECHAS (5-nov-2026).
//
// Antes, cualquier renta "activa" bloqueaba el vehículo desde que se
// firmaba hasta que se marcaba devuelta, aunque fuera una reserva para
// dentro de dos meses. Ahora un vehículo solo está ocupado en los días
// de cada renta:
//   - una renta ocupa desde su fecha de entrega hasta su devolución
//     prevista (ambos días incluidos: cada día corre hasta las 7:00pm);
//   - si ya empezó y está vencida (no se ha devuelto), sigue ocupando
//     hasta hoy, porque el vehículo todavía no ha vuelto.
// Una renta "devuelta" nunca ocupa nada.

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function esFecha(v) {
  return typeof v === "string" && FECHA_ISO.test(v);
}

// Días [inicio, fin] que ocupa una renta activa.
export function periodoOcupado(renta, hoy) {
  const inicio = renta.fecha_entrega;
  let fin = renta.fecha_prevista && renta.fecha_prevista >= inicio ? renta.fecha_prevista : inicio;
  if (inicio <= hoy && fin < hoy) fin = hoy;
  return { inicio, fin };
}

export function seCruzan(a1, a2, b1, b2) {
  return a1 <= b2 && b1 <= a2;
}

// ¿Ya empezó? (sirve para separar "Rentas en curso" de "Próximas reservas")
export function yaEmpezo(renta, hoy) {
  return renta.fecha_entrega <= hoy;
}

// Primera renta activa (de la lista) que choca con [desde, hasta].
export function buscarChoqueEn(rentas, desde, hasta, hoy, excluirIds = []) {
  return (
    (rentas || [])
      .filter((r) => r.estado !== "devuelta" && !excluirIds.includes(r.id))
      .find((r) => {
        const p = periodoOcupado(r, hoy);
        return seCruzan(desde, hasta, p.inicio, p.fin);
      }) || null
  );
}

// Busca en la base de datos si el vehículo tiene otra renta activa que
// choque con [desde, hasta].
export async function buscarChoque({ db, tabla, campo, vehiculoId, desde, hasta, hoy, excluirIds = [] }) {
  const { data, error } = await db
    .from(tabla)
    .select("id, estado, fecha_entrega, fecha_prevista")
    .eq(campo, vehiculoId)
    .eq("estado", "activa");
  if (error) throw new Error(error.message);
  return buscarChoqueEn(data, desde, hasta, hoy, excluirIds);
}

export function formatoDia(iso) {
  const [y, m, d] = String(iso).split("-");
  return `${d}/${m}/${y}`;
}

// Mensaje claro para el equipo o el cliente cuando hay un choque.
export function mensajeChoque(choque, hoy, { vehiculo = "Esa moto", idioma = "es" } = {}) {
  const p = periodoOcupado(choque, hoy);
  const empezo = yaEmpezo(choque, hoy);
  if (idioma === "en") {
    const que = vehiculo === "Esa moto" ? "That motorbike" : vehiculo === "Esa ebike" ? "That e-bike" : vehiculo;
    return empezo
      ? `${que} is rented until ${formatoDia(p.fin)}. Choose other dates or another vehicle.`
      : `${que} is booked from ${formatoDia(p.inicio)} to ${formatoDia(p.fin)}. Choose a return date before ${formatoDia(p.inicio)} or another vehicle.`;
  }
  return empezo
    ? `${vehiculo} está rentada hasta el ${formatoDia(p.fin)}. Elige otras fechas u otro vehículo.`
    : `${vehiculo} está reservada del ${formatoDia(p.inicio)} al ${formatoDia(p.fin)}. Elige una devolución antes del ${formatoDia(p.inicio)} u otro vehículo.`;
}

// Para la lista de disponibles: quita los vehículos ocupados en
// [desde, hasta] y, a los demás, les pone la fecha de su próxima reserva
// (si tienen una), para avisar "devolver antes del …".
export function filtrarDisponibles({ vehiculos, rentas, campo, desde, hasta, hoy }) {
  const porVehiculo = new Map();
  for (const r of rentas || []) {
    if (r.estado === "devuelta") continue;
    if (!porVehiculo.has(r[campo])) porVehiculo.set(r[campo], []);
    porVehiculo.get(r[campo]).push(r);
  }
  const libres = [];
  for (const v of vehiculos || []) {
    const suyas = porVehiculo.get(v.id) || [];
    if (buscarChoqueEn(suyas, desde, hasta, hoy)) continue;
    const proximas = suyas.map((r) => r.fecha_entrega).filter((f) => f > hasta).sort();
    libres.push(proximas.length ? { ...v, reservadaDesde: proximas[0] } : v);
  }
  return libres;
}

// Lee ?desde=&hasta= de una petición (por defecto: hoy en Panamá).
export function rangoDePedido(req, hoy = fechaHoyPanama()) {
  const p = new URL(req.url).searchParams;
  const desde = esFecha(p.get("desde")) ? p.get("desde") : hoy;
  let hasta = esFecha(p.get("hasta")) ? p.get("hasta") : desde;
  if (hasta < desde) hasta = desde;
  return { desde, hasta, hoy };
}
