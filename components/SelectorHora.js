"use client";

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS = ["00", "15", "30", "45"];

// input type="time" no se muestra de forma confiable en todos los
// navegadores de escritorio (algunas versiones de Safari/Chrome en Mac y
// Windows lo dejan como texto sin selector, y si el usuario no escribe el
// formato exacto el valor queda vacío). Este selector con <select> funciona
// igual en cualquier navegador o dispositivo.
export default function SelectorHora({ value, onChange }) {
  const [hh, mm] = (value || "09:00").split(":");

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select value={hh} onChange={(e) => onChange(`${e.target.value}:${mm}`)} style={{ flex: 1 }}>
        {HORAS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <div style={{ display: "flex", alignItems: "center", color: "#6B6255" }}>:</div>
      <select value={mm} onChange={(e) => onChange(`${hh}:${e.target.value}`)} style={{ flex: 1 }}>
        {MINUTOS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}
