"use client";

const HORAS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTOS = ["00", "15", "30", "45"];

function a24Horas(hora12, minuto, periodo) {
  let h = parseInt(hora12, 10) % 12;
  if (periodo === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${minuto}`;
}

function desde24Horas(valor) {
  const [hh, mm] = (valor || "09:00").split(":");
  let h = parseInt(hh, 10);
  const periodo = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return { hora12: String(h), minuto: mm || "00", periodo };
}

// input type="time" no se muestra de forma confiable en todos los
// navegadores/dispositivos, así que usamos <select> propios, en formato de
// 12 horas (con AM/PM) como es más natural para el cliente. Por dentro se
// sigue guardando en formato 24 horas (ej. "14:30") para que el cálculo de
// tarifa (que compara contra las 2:00pm y 5:00pm) no cambie.
export default function SelectorHora({ value, onChange }) {
  const { hora12, minuto, periodo } = desde24Horas(value);

  function actualizar(campo, val) {
    const siguiente = { hora12, minuto, periodo, [campo]: val };
    onChange(a24Horas(siguiente.hora12, siguiente.minuto, siguiente.periodo));
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      <select value={hora12} onChange={(e) => actualizar("hora12", e.target.value)} style={{ width: "100%" }}>
        {HORAS_12.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <select value={minuto} onChange={(e) => actualizar("minuto", e.target.value)} style={{ width: "100%" }}>
        {MINUTOS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select value={periodo} onChange={(e) => actualizar("periodo", e.target.value)} style={{ width: "100%" }}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
