"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  ["/admin", "Panel"],
  ["/admin/nueva-renta", "Nueva renta (moto)"],
  ["/admin/nueva-renta-ebike", "Nueva renta (ebike)"],
  ["/admin/flota", "Flota de motos"],
  ["/admin/ebikes", "Flota de ebikes"],
  ["/admin/calendario", "Calendario"],
  ["/admin/historial", "Historial"],
  ["/admin/precios", "Precios"],
  ["/admin/equipo", "Equipo"],
  ["/admin/respaldos", "Respaldos"],
];
const NAV_ADMIN = ["/admin/reportes", "Dinero"];

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
      <div style={{ width: 220, background: "#1C1D1F", flexShrink: 0, display: "flex", flexDirection: "column", paddingTop: 26, paddingBottom: 20 }}>
        <div style={{ padding: "0 18px 22px 18px", borderBottom: "1px solid #33342f" }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: "#F0A202", letterSpacing: "0.5px" }}>
            FLOW RENTALS
          </div>
          <div style={{ fontSize: 12.5, color: "#8A8577", marginTop: 2 }}>control de renta de vehículos</div>
        </div>
        {staffActual && (
          <div style={{ padding: "12px 18px", fontSize: 12.5, color: "#C9C4B6", borderBottom: "1px solid #33342f" }}>
            Conectado como <strong style={{ color: "#F0A202" }}>{staffActual.nombre}</strong>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <button className={"nav-btn" + (pathname === href ? " active" : "")}>{label}</button>
            </Link>
          ))}
          {staffActual?.es_admin && (
            <Link href={NAV_ADMIN[0]} style={{ textDecoration: "none" }}>
              <button className={"nav-btn" + (pathname === NAV_ADMIN[0] ? " active" : "")}>💰 {NAV_ADMIN[1]}</button>
            </Link>
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
