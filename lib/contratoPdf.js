import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { calcularTarifa, calcularTarifaEbike } from "./pricing";
import { TEXTOS_CONTRATO, TEXTOS_CONTRATO_EBIKE } from "./textos";
import { supabaseServer } from "./supabaseServer";

const estilos = StyleSheet.create({
  pagina: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  titulo: { fontSize: 15, textAlign: "center", marginBottom: 2, fontFamily: "Helvetica-Bold" },
  contratoNo: { fontSize: 9, textAlign: "center", color: "#777", marginBottom: 18 },
  filaCampos: { flexDirection: "row", marginBottom: 6, gap: 20 },
  campo: { flex: 1 },
  campoLabel: { fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 6 },
  parrafo: { marginBottom: 4, lineHeight: 1.4 },
  item: { marginBottom: 4, lineHeight: 1.4, paddingLeft: 10 },
  total: { fontFamily: "Helvetica-Bold", marginTop: 4 },
  firmaBloque: { marginTop: 50, flexDirection: "row", gap: 40 },
  firmaCol: { flex: 1 },
  firmaImg: { height: 50, marginBottom: 4, objectFit: "contain" },
  firmaLinea: { borderTopWidth: 1, borderTopColor: "#333", marginTop: 40, paddingTop: 4, fontSize: 9 },
});

function formatoDia(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

async function descargarImagenComoDataUri(path) {
  if (!path) return null;
  try {
    const [bucket, ...resto] = path.split("/");
    const archivo = resto.join("/");
    const db = supabaseServer();
    const { data, error } = await db.storage.from(bucket).download(archivo);
    if (error || !data) return null;
    const buffer = Buffer.from(await data.arrayBuffer());
    const tipo = archivo.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${tipo};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function Campos2({ a, b }) {
  return (
    <View style={estilos.filaCampos}>
      <View style={estilos.campo}><Text><Text style={estilos.campoLabel}>{a.label} </Text>{a.valor || "—"}</Text></View>
      {b && <View style={estilos.campo}><Text><Text style={estilos.campoLabel}>{b.label} </Text>{b.valor || "—"}</Text></View>}
    </View>
  );
}

function Secciones({ t }) {
  return (
    <>
      <Text style={estilos.h2}>{t.s2}</Text>
      <Text style={estilos.parrafo}>{t.s2intro}</Text>
      {t.s2items.map((x, i) => <Text key={i} style={estilos.item}>• {x}</Text>)}

      <Text style={estilos.h2}>{t.s3}</Text>
      {t.s3items.map((x, i) => <Text key={i} style={estilos.item}>• {x}</Text>)}

      <Text style={estilos.h2}>{t.s4}</Text>
      {t.s4items.map((x, i) => <Text key={i} style={estilos.item}>• {x}</Text>)}

      <Text style={estilos.h2}>{t.s5}</Text>
      {t.s5items.map((x, i) => <Text key={i} style={estilos.item}>• {x}</Text>)}

      <Text style={estilos.h2}>{t.s6}</Text>
      <Text style={estilos.parrafo}>{t.s6txt}</Text>
    </>
  );
}

function BloqueFirma({ t, firmaDataUri, fechaFirma }) {
  return (
    <View style={estilos.firmaBloque}>
      <View style={estilos.firmaCol}>
        {firmaDataUri && <Image src={firmaDataUri} style={estilos.firmaImg} />}
        <Text style={[estilos.firmaLinea, { marginTop: firmaDataUri ? 4 : 40 }]}>{t.firmaCliente}</Text>
        <Text style={{ fontSize: 8, color: "#777", marginTop: 2 }}>
          {firmaDataUri ? `${t.firmadoDigitalmente} ${formatoDia(fechaFirma)}` : ""}
        </Text>
      </View>
      <View style={estilos.firmaCol}>
        <Text style={estilos.firmaLinea}>{t.firmaRep}</Text>
        <Text style={[estilos.firmaLinea, { marginTop: 40 }]}>{t.fecha}</Text>
      </View>
    </View>
  );
}

// Genera el PDF del contrato de MOTO y devuelve un Buffer listo para
// adjuntar al correo.
export async function generarPdfContratoMoto({ renta, moto, tarifas }) {
  const idioma = renta.idioma === "en" ? "en" : "es";
  const t = TEXTOS_CONTRATO[idioma];
  const resultado = calcularTarifa({
    tipoMoto: moto?.tipo,
    fechaEntrega: renta.fecha_entrega,
    horaEntrega: renta.hora_entrega,
    fechaPrevista: renta.fecha_prevista,
    tarifas,
  });
  const coberturaPrecio = Number(renta.cobertura_precio) || 0;
  const extrasTotal = (renta.extras || []).reduce((s, e) => s + (Number(e.precio) || 0), 0);
  const totalFinal = renta.tarifa_total != null ? Number(renta.tarifa_total) : resultado.total + coberturaPrecio + extrasTotal;
  const firmaDataUri = await descargarImagenComoDataUri(renta.firma_cliente_url);

  const doc = (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.titulo}>{t.titulo}</Text>
        <Text style={estilos.contratoNo}>{t.contratoNo} {(renta.id || "").slice(0, 8).toUpperCase()}</Text>

        <Campos2 a={{ label: t.nombreCliente, valor: renta.cliente }} b={{ label: t.pasaporte, valor: renta.cedula }} />
        <Campos2 a={{ label: t.telefono, valor: renta.telefono }} b={{ label: t.hotel, valor: renta.hotel }} />
        <Campos2 a={{ label: t.correo, valor: renta.correo }} />

        <Text style={estilos.h2}>{t.s1}</Text>
        <Text style={estilos.parrafo}>{t.s1txt}</Text>
        <Campos2 a={{ label: t.marcaModelo, valor: moto?.modelo }} b={{ label: t.placa, valor: moto?.placa }} />
        <Campos2 a={{ label: t.fechaAlquiler, valor: formatoDia(renta.fecha_entrega) }} b={{ label: t.horaAlquiler, valor: renta.hora_entrega }} />
        <Campos2 a={{ label: t.fechaDevolucion, valor: formatoDia(renta.fecha_prevista) }} />
        <Text style={estilos.parrafo}>{t.tarifaAplicada} {t.reglaDia}</Text>
        <Text style={estilos.parrafo}>{t.rentaBase}: ${(totalFinal - coberturaPrecio - extrasTotal).toFixed(2)} {t.usd}</Text>
        {coberturaPrecio > 0 && <Text style={estilos.parrafo}>{t.coberturaLinea}: ${coberturaPrecio.toFixed(2)} {t.usd}</Text>}
        {(renta.extras || []).map((e, i) => <Text key={i} style={estilos.parrafo}>{e.nombre}: ${Number(e.precio).toFixed(2)} {t.usd}</Text>)}
        <Text style={estilos.total}>{t.totalEstimado} ${totalFinal.toFixed(2)} {t.usd}</Text>

        <Secciones t={t} />
        <BloqueFirma t={t} firmaDataUri={firmaDataUri} fechaFirma={renta.fecha_firma} />
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}

// Igual, pero para EBIKE (sin hora de entrega ni cobertura premium)
export async function generarPdfContratoEbike({ renta, ebike, tarifaDia }) {
  const idioma = renta.idioma === "en" ? "en" : "es";
  const t = TEXTOS_CONTRATO_EBIKE[idioma];
  const resultado = calcularTarifaEbike({
    fechaEntrega: renta.fecha_entrega,
    fechaPrevista: renta.fecha_prevista,
    tarifaDia,
  });
  const extrasTotal = (renta.extras || []).reduce((s, e) => s + (Number(e.precio) || 0), 0);
  const totalFinal = renta.tarifa_total != null ? Number(renta.tarifa_total) : resultado.total + extrasTotal;
  const firmaDataUri = await descargarImagenComoDataUri(renta.firma_cliente_url);

  const doc = (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.titulo}>{t.titulo}</Text>
        <Text style={estilos.contratoNo}>{t.contratoNo} {(renta.id || "").slice(0, 8).toUpperCase()}</Text>

        <Campos2 a={{ label: t.nombreCliente, valor: renta.cliente }} b={{ label: t.pasaporte, valor: renta.cedula }} />
        <Campos2 a={{ label: t.telefono, valor: renta.telefono }} b={{ label: t.hotel, valor: renta.hotel }} />
        <Campos2 a={{ label: t.correo, valor: renta.correo }} />

        <Text style={estilos.h2}>{t.s1}</Text>
        <Text style={estilos.parrafo}>{t.s1txt}</Text>
        <Campos2 a={{ label: t.numero, valor: ebike?.numero ? `#${ebike.numero}` : "—" }} />
        <Campos2 a={{ label: t.fechaAlquiler, valor: formatoDia(renta.fecha_entrega) }} b={{ label: t.fechaDevolucion, valor: formatoDia(renta.fecha_prevista) }} />
        <Text style={estilos.parrafo}>{t.tarifaAplicada} {t.reglaEbike(resultado.dias)}</Text>
        <Text style={estilos.parrafo}>{t.rentaBase}: ${(totalFinal - extrasTotal).toFixed(2)} {t.usd}</Text>
        {(renta.extras || []).map((e, i) => <Text key={i} style={estilos.parrafo}>{e.nombre}: ${Number(e.precio).toFixed(2)} {t.usd}</Text>)}
        <Text style={estilos.total}>{t.totalEstimado} ${totalFinal.toFixed(2)} {t.usd}</Text>

        <Secciones t={t} />
        <BloqueFirma t={t} firmaDataUri={firmaDataUri} fechaFirma={renta.fecha_firma} />
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
