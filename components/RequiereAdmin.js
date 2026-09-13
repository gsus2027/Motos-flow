"use client";
import { useStaffActual } from "@/lib/staffContext";

// Envuelve una pantalla del panel que debe verse SOLO si el usuario
// conectado es administrador. Usa la sesión que el layout del panel ya
// cargó una vez (en vez de pedirla otra vez aquí), para no duplicar
// peticiones de red y que las pantallas carguen más rápido.
export default function RequiereAdmin({ children }) {
  const { staffActual, cargando } = useStaffActual();

  if (cargando) {
    return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;
  }
  if (!staffActual?.es_admin) {
    return (
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        Esta sección es solo para administradores. Si crees que deberías tener acceso, pídele a un administrador que te dé el rol desde &quot;Equipo&quot;.
      </div>
    );
  }
  return children;
}
