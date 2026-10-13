// Usuario activo siempre visible (13-oct-2026): cada miembro del equipo
// tiene SU color, siempre el mismo (sale de su id), para que de lejos se
// note si la sesión abierta es la de otro. Todos son oscuros: el texto
// blanco encima cumple contraste 4.5:1.
export const COLORES_STAFF = ["#0f5f59", "#6b3589", "#9c4a12", "#1f4e9c", "#2e6b1f", "#8a1f4a", "#4a4f57", "#6e5300"];

export function colorDeStaff(id) {
  const texto = String(id ?? "");
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return COLORES_STAFF[h % COLORES_STAFF.length];
}

export function primerNombre(nombre) {
  return String(nombre || "").trim().split(/\s+/)[0] || "tú";
}

export function inicial(nombre) {
  return (String(nombre || "").trim()[0] || "?").toUpperCase();
}
