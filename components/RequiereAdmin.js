"use client";
import { useEffect, useState } from "react";

// Envuelve una pantalla del panel que debe verse SOLO si el usuario
// conectado es administrador. Si alguien sin ese rol entra directo por
// la URL (sin pasar por un link, que ya está oculto), esto lo bloquea
// también aquí — no basta con esconder el link en la barra lateral.
export default function RequiereAdmin({ children }) {
  const [staffActual, setStaffActual] = useState(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setStaffActual(d.staffActual || null))
      .catch(() => setStaffActual(false));
  }, []);

  if (staffActual === null) {
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
