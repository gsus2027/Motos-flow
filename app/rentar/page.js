import FormularioRenta from "@/components/FormularioRenta";

export const metadata = { title: "Nueva renta — Bitácora" };

export default function PaginaRentar() {
  return (
    <div style={{ minHeight: "100vh", padding: "28px 16px 60px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto 22px" }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: "#22201C", letterSpacing: "0.5px" }}>
          BITÁCORA
        </div>
        <div style={{ fontSize: 12.5, color: "#6B6255", marginTop: 2 }}>Formulario de renta / Rental form</div>
      </div>
      <FormularioRenta />
    </div>
  );
}
