// Usamos la API Web Crypto (globalThis.crypto.subtle) en vez del módulo
// "crypto" de Node, porque este archivo se importa tanto desde las rutas
// de API (Node runtime) como desde middleware.js (Edge runtime), y Edge
// Runtime solo soporta Web Crypto, no los módulos nativos de Node.

const COOKIE_NAME = "bitacora_session";
const DURACION_MAXIMA_MS = 30 * 24 * 60 * 60 * 1000; // 30 días — debe coincidir con el maxAge de la cookie

function secretBytes() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Nunca debe pasar esto en producción — es mejor que la app falle
    // claramente a que use un secreto adivinable, con el que cualquiera
    // podría falsificar sesiones válidas.
    throw new Error("Falta configurar la variable de entorno SESSION_SECRET.");
  }
  return new TextEncoder().encode(secret);
}

async function hmacHex(mensaje) {
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(mensaje));
  return Buffer.from(buf).toString("hex");
}

function comparacionSegura(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---- Sesión (cookie del panel) ----
// El token ahora incluye QUIÉN entró (el id del miembro del staff), no
// solo que "alguien válido" entró — así cada quien tiene su propia cuenta.
export async function crearToken(staffId) {
  const payload = `staff.${staffId}.${Date.now()}`;
  const firma = await hmacHex(payload);
  return `${payload}.${firma}`;
}

// Devuelve { staffId } si el token es válido, o null si no lo es.
// (Sigue funcionando con "if (!(await tokenValido(token)))" en el resto
// del código, porque null es "falsy" y un objeto es "truthy".)
export async function tokenValido(token) {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 4) return null;
  const [tipo, staffId, ts, firma] = partes;
  if (tipo !== "staff") return null;
  const payload = `${tipo}.${staffId}.${ts}`;
  const esperada = await hmacHex(payload);
  if (!comparacionSegura(esperada, firma)) return null;

  const emitido = Number(ts);
  if (!Number.isFinite(emitido)) return null;
  if (Date.now() - emitido > DURACION_MAXIMA_MS) return null;

  return { staffId };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

// ---- PINs individuales ----
// Cada miembro del staff tiene su propia "sal" al azar, para que dos
// personas con el mismo PIN no generen el mismo hash guardado, y el PIN
// nunca se guarda en texto plano en la base de datos.
export function generarSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Buffer.from(bytes).toString("hex");
}

export async function hashPin(pin, salt) {
  return hmacHex(`pin:${salt}:${pin}`);
}

export async function pinCoincide(pin, salt, hashGuardado) {
  const calculado = await hashPin(pin, salt);
  return comparacionSegura(calculado, hashGuardado);
}
