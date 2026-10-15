import "./globals.css";
import IndicadorCarga from "@/components/IndicadorCarga";

export const metadata = {
  title: "Flow Rentals — control de motos",
  description: "Sistema de renta de motocicletas",
};

export default function AppLayout({ children }) {
  // Ruedita en el botón y barra arriba mientras carga (14-oct-2026).
  return (
    <>
      <IndicadorCarga color="#0071E3" />
      {children}
    </>
  );
}
