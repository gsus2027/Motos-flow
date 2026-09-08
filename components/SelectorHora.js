"use client";

// Genera las opciones cada 15 minutos, de 12:00 AM a 11:45 PM, en un solo
// <select>. Es una sola casilla (no 3 campos separados), así el cliente no
// puede dejar la hora, los minutos o el AM/PM sin tocar por accidente.
// El valor guardado internamente sigue en formato 24 horas (ej. "14:30")
// para que el cálculo de tarifa (que compara contra las 2:00pm y 5:00pm)
// no cambie.
function generarOpciones() {
  const opciones = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const valor = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      const periodo = h >= 12 ? "PM" : "AM";
      const etiqueta = `${h12}:${String(m).padStart(2, "0")} ${periodo}`;
      opciones.push({ valor, etiqueta });
    }
  }
  return opciones;
}

const OPCIONES = generarOpciones();

export default function SelectorHora({ value, onChange }) {
  return (
    <select value={value || "09:00"} onChange={(e) => onChange(e.target.value)}>
      {OPCIONES.map((o) => (
        <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
      ))}
    </select>
  );
}
