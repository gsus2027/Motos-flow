"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  ["/admin", "Panel"],
  ["/admin/nueva-renta", "Nueva renta (moto)"],
  ["/admin/nueva-renta-ebike", "Nueva renta (ebike)"],
  ["/admin/calendario", "Calendario"],
  ["/admin/historial", "Historial"],
];
const NAV_ADMIN = [
  ["/admin/flota", "Flota de motos"],
  ["/admin/ebikes", "Flota de ebikes"],
  ["/admin/precios", "Precios"],
  ["/admin/equipo", "Equipo"],
  ["/admin/respaldos", "Respaldos"],
  ["/admin/reportes", "💰 Dinero"],
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [staffActual, setStaffActual] = useState(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setStaffActual(d.staffActual || null))
      .catch(() => {});
  }, []);

  async function bloquear() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/admin/entrar");
  }

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
          <button className="nav-btn" onClick={bloquear}>🔒 Bloquear panel</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: "36px 40px", maxWidth: 1000 }}>{children}</div>
    </div>
  );
}
