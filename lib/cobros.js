// Cobros de rentas (cuadre de pagos, 13-oct-2026). Ver supabase-schema-cobros.sql.
// Este archivo no toca la base de datos: solo reglas compartidas entre la
// API (/api/cobros) y las pantallas (Panel, Cierre del día).

export const METODOS_COBRO = ["efectivo", "tarjeta", "yappy"];
export const METODO_COBRO_LABELS = { efectivo: "Efectivo", tarjeta: "Tarjeta", yappy: "Yappy" };

export function metodoPideAutorizacion(metodo) {
  return metodo === "tarjeta" || metodo === "yappy";
}

// Deja solo dígitos y se queda con los últimos 4 (si escriben el número de
// autorización completo de 6 dígitos también sirve). "" si no hay 4.
export function normalizarAutorizacion(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  return digitos.length >= 4 ? digitos.slice(-4) : "";
}

// Devuelve { ult4 } o { error } — sin lanzar, para que la ruta responda 400.
export function validarAutorizacion(metodo, valor) {
  if (!metodoPideAutorizacion(metodo)) return { ult4: null };
  const ult4 = normalizarAutorizacion(valor);
  if (!ult4) {
    return {
      error:
        metodo === "yappy"
          ? "Escribe los últimos 4 dígitos del número de confirmación de Yappy."
          : 'Escribe los últimos 4 dígitos del número de autorización del recibo (línea "AUTO." del recibo BAC).',
    };
  }
  return { ult4 };
}

export const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;

// Cuánto se ha pagado de una renta y cuánto falta, a partir de sus cobros.
export function estadoCobro(renta, cobrosDeLaRenta) {
  const lista = Array.isArray(cobrosDeLaRenta) ? cobrosDeLaRenta : [];
  const total = r2(renta?.tarifa_total);
  const pagado = r2(lista.reduce((s, c) => s + Number(c.monto || 0), 0));
  const pendiente = r2(Math.max(0, total - pagado));
  return { total, pagado, pendiente, cobros: lista };
}

// Clave para agrupar cobros por renta (moto y ebike usan tablas distintas).
export function claveRenta(tipo, id) {
  return `${tipo}:${id}`;
}

// Límites de un día 'YYYY-MM-DD' en hora de Panamá (UTC-5 todo el año).
export function inicioDiaPanama(fecha) {
  return new Date(`${fecha}T00:00:00.000-05:00`).toISOString();
}
export function finDiaPanama(fecha) {
  return new Date(`${fecha}T23:59:59.999-05:00`).toISOString();
}
