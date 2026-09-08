// Usamos la API Web Crypto (globalThis.crypto.subtle) en vez del módulo
// "crypto" de Node, porque este archivo se importa tanto desde las rutas
// de API (Node runtime) como desde middleware.js (Edge runtime), y Edge
// Runtime solo soporta Web Crypto, no los módulos nativos de Node.

const COOKIE_NAME = "bitacora_session";

function secretBytes() {
  const secret = process.env.SESSION_SECRET || "cambia-esto";
  return new TextEncoder().encode(secret);
}

async function firmar(payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const firmaBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Buffer.from(firmaBuffer).toString("hex");
}

export async function crearToken() {
  const payload = `staff.${Date.now()}`;
  const firma = await firmar(payload);
  return `${payload}.${firma}`;
}

export async function tokenValido(token) {
  if (!token) return false;
  const partes = token.split(".");
  if (partes.length !== 3) return false;
  const [tipo, ts, firma] = partes;
  const payload = `${tipo}.${ts}`;
  const esperada = await firmar(payload);
  if (esperada.length !== firma.length) return false;
  // Comparación en tiempo constante para evitar timing attacks
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) {
    diff |= esperada.charCodeAt(i) ^ firma.charCodeAt(i);
  }
  return diff === 0;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
