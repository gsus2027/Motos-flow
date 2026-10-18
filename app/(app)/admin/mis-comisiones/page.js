"use client";
import Link from "next/link";
import MisComisiones from "@/components/MisComisiones";
import { useStaffActual } from "@/lib/staffContext";

// 18-oct-2026 (pedido de Jesús): las comisiones de cada miembro del equipo
// salen en su propia pantalla, ya no en el Panel. Solo se ve el periodo
// abierto: al pagar un periodo, sus días desaparecen de aquí y el registro
// queda para los administradores en Administración → Comisiones.
export default function MisComisionesPage() {
  const { staffActual } = useStaffActual();
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Mis comisiones</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 22px" }}>
        Lo que llevas ganado desde el último pago. Cuando se pagan las comisiones, el contador vuelve a empezar.
      </p>
      <MisComisiones vacio="Tu usuario no cobra comisión, o todavía no tienes rentas en este periodo." />
      {staffActual?.es_admin && (
        <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
          Los periodos ya pagados y las comisiones de todo el equipo están en{" "}
          <Link href="/admin/comisiones" style={{ color: "var(--amber)" }}>
            Administración → Comisiones
          </Link>
          .
        </p>
      )}
    </div>
  );
}
