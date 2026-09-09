import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Si las variables de entorno de Upstash no están configuradas, los
// limitadores quedan en "null" y verificarLimite() deja pasar todo sin
// bloquear nada — así la app nunca se rompe por falta de configuración,
// simplemente no queda protegida hasta que se agreguen las variables.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function crearLimitador(nombre, cantidad, ventana) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(cantidad, ventana),
    prefix: `ratelimit:${nombre}`,
    analytics: true,
  });
}

// Código de acceso del panel (/api/auth): pocos intentos permitidos, para
// que adivinar el código por fuerza bruta no sea viable.
export const limitadorAuth = crearLimitador("auth", 8, "10 m");

// Rutas públicas de escritura (crear renta, subir foto/firma, agregar
// moto/ebike): un límite más generoso, pensado para uso normal, pero que
// bloquea el envío masivo automatizado.
export const limitadorEscritura = crearLimitador("escritura", 20, "1 m");

export function ipDelRequest(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "desconocida";
}

export async function verificarLimite(limitador, ip) {
  if (!limitador) return { exito: true };
  const resultado = await limitador.limit(ip);
  return { exito: resultado.success, restante: resultado.remaining };
}
