"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { StaffProvider } from "@/lib/staffContext";
import { colorDeStaff, primerNombre, inicial } from "@/lib/colorStaff";

// Usuario activo siempre visible (13-oct-2026): si nadie toca la pantalla en
// 5 horas, el panel se bloquea solo. La última actividad se comparte
// entre pestañas (localStorage); si el navegador no lo permite, cada pestaña
// cuenta por su lado.
const MINUTOS_INACTIVIDAD = 300; // 5 horas
const CLAVE_ACTIVIDAD = "flow-ultima-actividad";
function leerActividad() {
  try {
    return Number(window.localStorage.getItem(CLAVE_ACTIVIDAD)) || 0;
  } catch {
    return 0;
  }
}
function guardarActividad(ms) {
  try {
    window.localStorage.setItem(CLAVE_ACTIVIDAD, String(ms));
  } catch {
    // sin almacenamiento
  }
}

const NAV = [
  ["/admin", "Panel"],
  ["/admin/nueva-renta", "Nueva renta (moto)"],
  ["/admin/nueva-renta-ebike", "Nueva renta (ebike)"],
  ["/admin/calendario", "Calendario"],
  ["/admin/historial", "Historial"],
  ["/admin/cierre", "Cierre del día"],
  ["/admin/mis-comisiones", "🏆 Mis comisiones"],
];
const NAV_ADMIN = [
  ["/admin/flota", "Flota de motos"],
  ["/admin/ebikes", "Flota de ebikes"],
  ["/admin/precios", "Precios"],
  ["/admin/extras", "Extras y coberturas"],
  ["/admin/equipo", "Equipo"],
  ["/admin/respaldos", "Respaldos"],
  ["/admin/reportes", "💰 Dinero"],
  ["/admin/comisiones", "🏆 Comisiones del equipo"],
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [staffActual, setStaffActual] = useState(null);
  const [cargandoStaff, setCargandoStaff] = useState(true);

  // Se vuelve a preguntar quién está conectado al cambiar de pantalla
  // (13-oct-2026): la pantalla de entrar comparte este layout, así que sin
  // esto la franja de "Atendiendo ahora" seguía mostrando al anterior
  // después de cambiar de usuario.
  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setStaffActual(d.staffActual || null))
      .catch(() => {})
      .finally(() => setCargandoStaff(false));
  }, [pathname]);

  async function bloquear(motivo) {
    await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
    setStaffActual(null);
    router.push(motivo ? `/admin/entrar?motivo=${motivo}` : "/admin/entrar");
  }

  useEffect(() => {
    if (!staffActual) return undefined;
    const limiteMs = MINUTOS_INACTIVIDAD * 60 * 1000;
    let ultimaLocal = Date.now();
    let ultimoGuardado = 0;
    let cerrado = false;
    guardarActividad(ultimaLocal);
    const marcar = () => {
      ultimaLocal = Date.now();
      if (ultimaLocal - ultimoGuardado > 5000) {
        ultimoGuardado = ultimaLocal;
        guardarActividad(ultimaLocal);
      }
    };
    const eventos = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"];
    eventos.forEach((e) => window.addEventListener(e, marcar, { passive: true }));
    const revisar = () => {
      if (!cerrado && Date.now() - Math.max(ultimaLocal, leerActividad()) > limiteMs) {
        cerrado = true;
        bloquear("inactivo");
      }
    };
    const intervalo = window.setInterval(revisar, 30 * 1000);
    document.addEventListener("visibilitychange", revisar);
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, marcar));
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", revisar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffActual]);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: 220, background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)", flexShrink: 0, display: "flex", flexDirection: "column", paddingTop: 26, paddingBottom: 20 }}>
        <div style={{ padding: "0 18px 22px 18px", borderBottom: "1px solid var(--sidebar-border)" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--sidebar-text)", letterSpacing: "-0.02em" }}>
            Flow Rentals
          </div>
          <div style={{ fontSize: 12.5, color: "var(--sidebar-text-muted)", marginTop: 2 }}>control de renta de vehículos</div>
        </div>
        {staffActual && (
          <div style={{ padding: "12px 18px", fontSize: 12.5, color: "var(--sidebar-text-muted)", borderBottom: "1px solid var(--sidebar-border)" }}>
            Conectado como <strong style={{ color: "var(--amber)" }}>{staffActual.nombre}</strong>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <button className={"nav-btn" + (pathname === href ? " active" : "")}>{label}</button>
            </Link>
          ))}
          {staffActual?.es_admin && (
            <>
              <div style={{ margin: "14px 18px 6px", fontSize: 11, fontWeight: 700, color: "var(--sidebar-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Administración
              </div>
              {NAV_ADMIN.map(([href, label]) => (
                <Link key={href} href={href} style={{ textDecoration: "none" }}>
                  <button className={"nav-btn" + (pathname === href ? " active" : "")}>{label}</button>
                </Link>
              ))}
            </>
          )}
        </div>
        <div style={{ marginTop: "auto", paddingTop: 20 }}>
          <button className="nav-btn" onClick={() => bloquear()}>🔒 Bloquear panel</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: "28px 40px 36px", maxWidth: 1000, minWidth: 0 }}>
        {staffActual && (
          <div
            className="no-print"
            style={{
              background: colorDeStaff(staffActual.id),
              color: "#fff",
              borderRadius: 18,
              padding: "14px 20px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 50, height: 50, borderRadius: "50%", background: "#fff", color: colorDeStaff(staffActual.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, flexShrink: 0 }}
            >
              {inicial(staffActual.nombre)}
            </div>
            <div style={{ flex: "1 1 180px", minWidth: 0 }}>
              <div style={{ fontSize: 12.5, opacity: 0.9 }}>Atendiendo ahora</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>{staffActual.nombre}</div>
            </div>
            <button
              type="button"
              onClick={() => bloquear("cambio")}
              style={{ minHeight: 44, padding: "0 18px", borderRadius: 980, border: "2px solid #fff", background: "transparent", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              No soy {primerNombre(staffActual.nombre)}
            </button>
          </div>
        )}
        <StaffProvider value={{ staffActual, cargando: cargandoStaff }}>{children}</StaffProvider>
      </div>
    </div>
  );
}
