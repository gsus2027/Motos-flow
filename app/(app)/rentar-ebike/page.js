import FormularioRentaEbike from "@/components/FormularioRentaEbike";

export const metadata = { title: "Nueva renta de Ebike — Flow Rentals" };

export default function PaginaRentarEbike() {
  return (
    <div className="tema-cliente" style={{ minHeight: "100vh", padding: "28px 16px 60px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto 22px" }}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Flow Rentals
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Formulario de renta de Ebike / Ebike rental form</div>
      </div>
      <FormularioRentaEbike />
    </div>
  );
}
