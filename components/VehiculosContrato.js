// Tabla de vehículos de un contrato con más de una moto / e-bike
// (18-oct-2026). Se muestra en el contrato (Panel, Historial, Reportes) y
// tiene su versión HTML para el correo en lib/email.js.
const TXT = {
  es: {
    titulo: "Vehículos de este contrato",
    moto: "Moto",
    ebike: "E-bike",
    vehiculo: "Vehículo",
    tarifa: "Tarifa",
    total: "Total del contrato",
    agregada: (n, quien, cuando) =>
      `Vehículo ${n} agregado a este contrato${cuando ? ` el ${cuando}` : ""}${quien ? ` por ${quien}` : ""}, a pedido del cliente. Aplican las mismas condiciones, fechas y cobertura firmadas.`,
  },
  en: {
    titulo: "Vehicles in this agreement",
    moto: "Motorcycle",
    ebike: "E-bike",
    vehiculo: "Vehicle",
    tarifa: "Rate",
    total: "Agreement total",
    agregada: (n, quien, cuando) =>
      `Vehicle ${n} was added to this agreement${cuando ? ` on ${cuando}` : ""}${quien ? ` by ${quien}` : ""} at the customer's request. The same signed terms, dates and coverage apply.`,
  },
};

export function textosVehiculos(idioma) {
  return TXT[idioma === "en" ? "en" : "es"];
}

export function cuandoAgregado(iso, idioma) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(idioma === "en" ? "en-US" : "es-PA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Panama",
  });
}

export function nombreVehiculo(r) {
  if (r.motos) return `${r.motos.modelo || ""} · ${r.motos.placa || ""}`.trim();
  if (r.ebikes) return `#${r.ebikes.numero}`;
  return "—";
}

export default function VehiculosContrato({ grupo, idioma, tipo }) {
  if (!grupo || grupo.length < 2) return null;
  const t = textosVehiculos(idioma);
  const total = grupo.reduce((s, r) => s + (Number(r.tarifa_total) || 0), 0);
  const celda = { padding: "5px 6px", borderBottom: "1px solid #ddd", fontSize: 13 };
  return (
    <div style={{ margin: "14px 0 6px" }}>
      <h2 style={{ fontSize: 15, margin: "0 0 6px" }}>{t.titulo}</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "inherit" }}>
        <thead>
          <tr>
            <th style={{ ...celda, textAlign: "left" }}>#</th>
            <th style={{ ...celda, textAlign: "left" }}>{t.vehiculo}</th>
            <th style={{ ...celda, textAlign: "right" }}>{t.tarifa}</th>
          </tr>
        </thead>
        <tbody>
          {grupo.map((r, i) => (
            <tr key={r.id}>
              <td style={celda}>{i + 1}</td>
              <td style={celda}>
                {tipo === "ebike" ? t.ebike : t.moto} {nombreVehiculo(r)}
                {r.estado === "devuelta" ? " ✓" : ""}
              </td>
              <td style={{ ...celda, textAlign: "right" }}>${(Number(r.tarifa_total) || 0).toFixed(2)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...celda, fontWeight: 700 }} colSpan={2}>
              {t.total}
            </td>
            <td style={{ ...celda, textAlign: "right", fontWeight: 700 }}>${total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      {grupo.slice(1).map((r, i) => (
        <p key={r.id} style={{ margin: "8px 0 0", fontSize: 12.5 }}>
          {t.agregada(i + 2, r.agregado_por, cuandoAgregado(r.agregado_en, idioma))}
        </p>
      ))}
    </div>
  );
}
