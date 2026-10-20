"use client";
import Link from "next/link";
import MisComisiones from "@/components/MisComisiones";
import { useStaffActual } from "@/lib/staffContext";

// 18-oct-2026 (pedido de Jesús): las comisiones de cada miembro del equipo
// salen en su propia pantalla, ya no en el Panel.
// 20-oct-2026: solo se ve lo que falta por cobrar. Los días ya pagados
// desaparecen; los pagos y el historial son solo para administradores
// (Administración → Comisiones del equipo).
export default function MisComisionesPage() {
  const { staffActual } = useStaffActual();
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Mis comisiones</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 22px" }}>
        Lo que tienes pendiente de cobrar. Cuando se te paga, esos días salen de la lista.
      </p>
      <MisComisiones vacio="Tu usuario no cobra comisión, o todavía no tienes comisiones por cobrar." />
      {staffActual?.es_admin && (
        <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
          Los pagos y las comisiones de todo el equipo están en{" "}
          <Link href="/admin/comisiones" style={{ color: "var(--amber)" }}>
            Administración → Comisiones
          </Link>
          .
        </p>
      )}
    </div>
  );
}
