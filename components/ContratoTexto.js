import { calcularTarifa } from "@/lib/pricing";

function formatoDia(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function textoRegla(t, resultado) {
  if (resultado.regla === "especial") return t.reglaEspecial;
  if (resultado.regla === "nocturno") return t.reglaNocturno;
  if (resultado.regla === "porDiasConEspecial") return t.reglaPorDiasConEspecial(resultado.dias);
  if (resultado.regla === "porDias") return t.reglaPorDias(resultado.dias);
  return t.reglaDia;
}

function Campo({ label, valor }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <span style={{ fontWeight: 700 }}>{label} </span>
      <span style={{ borderBottom: "1px solid #333", paddingBottom: 1 }}>
        {valor || "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
      </span>
    </div>
  );
}

export default function ContratoTexto({ renta, moto, t, tarifas }) {
  const resultado = calcularTarifa({
    tipoMoto: moto?.tipo,
    fechaEntrega: renta.fechaEntrega,
    horaEntrega: renta.horaEntrega,
    fechaPrevista: renta.fechaPrevista,
    tarifas,
  });
  const coberturaPrecio = Number(renta.cobertura_precio) || 0;
  const extrasTotal = (renta.extras || []).reduce((suma, e) => suma + (Number(e.precio) || 0), 0);
  // Si ya es una renta guardada de verdad, usamos su total real (el que
  // efectivamente se cobró) en vez de recalcularlo — así nunca se
  // desactualiza aunque los precios hayan cambiado desde entonces.
  const totalFinal = renta.tarifa_total != null ? Number(renta.tarifa_total) : resultado.total + coberturaPrecio + extrasTotal;
  const rentaBaseMostrar = renta.tarifa_total != null ? totalFinal - coberturaPrecio - extrasTotal : resultado.total;

  return (
    <>
      <h1 style={{ fontSize: 19, textAlign: "center", letterSpacing: "0.4px", marginBottom: 2 }}>{t.titulo}</h1>
      <div style={{ textAlign: "center", color: "#777", fontSize: 12, marginBottom: 22 }}>
        {t.contratoNo} {(renta.id || "").slice(0, 8).toUpperCase()}
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
        <Campo label={t.nombreCliente} valor={renta.cliente} />
        <Campo label={t.pasaporte} valor={renta.cedula} />
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
        <Campo label={t.telefono} valor={renta.telefono} />
        <Campo label={t.hotel} valor={renta.hotel} />
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
        <Campo label={t.correo} valor={renta.correo} />
      </div>

      <h2 style={{ fontSize: 15, margin: "22px 0 6px" }}>{t.s1}</h2>
      <p style={{ margin: "6px 0" }}>{t.s1txt}</p>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
        <Campo label={t.marcaModelo} valor={moto?.modelo} />
        <Campo label={t.placa} valor={moto?.placa} />
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
        <Campo label={t.fechaAlquiler} valor={formatoDia(renta.fechaEntrega)} />
        <Campo label={t.horaAlquiler} valor={renta.horaEntrega} />
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
        <Campo label={t.fechaDevolucion} valor={formatoDia(renta.fechaPrevista)} />
      </div>
      <p style={{ margin: "10px 0" }}>{t.tarifaAplicada} {textoRegla(t, resultado)}</p>
      <p style={{ margin: "2px 0" }}>{t.rentaBase || "Renta"}: ${rentaBaseMostrar.toFixed(2)} {t.usd}</p>
      {coberturaPrecio > 0 && (
        <p style={{ margin: "2px 0" }}>{t.coberturaLinea || "Cobertura premium"}: ${coberturaPrecio.toFixed(2)} {t.usd}</p>
      )}
      {(renta.extras || []).length > 0 && (renta.extras || []).map((ex, i) => (
        <p key={i} style={{ margin: "2px 0" }}>{ex.nombre}: ${Number(ex.precio).toFixed(2)} {t.usd}</p>
      ))}
      <p style={{ margin: "6px 0", fontWeight: 700 }}>{t.totalEstimado} ${totalFinal.toFixed(2)} {t.usd}</p>

      <h2 style={{ fontSize: 15, margin: "22px 0 6px" }}>{t.s2}</h2>
      <p style={{ margin: "6px 0" }}>{t.s2intro}</p>
      <ul style={{ margin: "6px 0", paddingLeft: 20 }}>
        {t.s2items.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
      </ul>

      <h2 style={{ fontSize: 15, margin: "22px 0 6px" }}>{t.s3}</h2>
      <ul style={{ margin: "6px 0", paddingLeft: 20 }}>
        {t.s3items.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
      </ul>

      <h2 style={{ fontSize: 15, margin: "22px 0 6px" }}>{t.s4}</h2>
      <ul style={{ margin: "6px 0", paddingLeft: 20 }}>
        {t.s4items.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
      </ul>

      <h2 style={{ fontSize: 15, margin: "22px 0 6px" }}>{t.s5}</h2>
      <ul style={{ margin: "6px 0", paddingLeft: 20 }}>
        {t.s5items.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
      </ul>

      <h2 style={{ fontSize: 15, margin: "22px 0 6px" }}>{t.s6}</h2>
      <p style={{ margin: "6px 0" }}>{t.s6txt}</p>
    </>
  );
}
