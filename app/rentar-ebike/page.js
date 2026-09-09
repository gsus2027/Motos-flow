import FormularioRentaEbike from "@/components/FormularioRentaEbike";

export const metadata = { title: "Nueva renta de Ebike — Flow Rentals" };

export default function PaginaRentarEbike() {
  return (
    <div className="v2" style={{ minHeight: "100vh", padding: "28px 16px 60px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto 22px" }}>
        <div className="v2-brand" style={{ fontSize: 22, color: "var(--text)" }}>
          FLOW RENTALS
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>Formulario de renta de Ebike / Ebike rental form</div>
      </div>
      <FormularioRentaEbike />
    </div>
  );
}
