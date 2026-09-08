"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  ["/admin", "Panel"],
  ["/admin/nueva-renta", "Nueva renta"],
  ["/admin/flota", "Flota"],
  ["/admin/calendario", "Calendario"],
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  async function bloquear() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/admin/entrar");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: 220, background: "#1C1D1F", flexShrink: 0, display: "flex", flexDirection: "column", paddingTop: 26, paddingBottom: 20 }}>
        <div style={{ padding: "0 18px 22px 18px", borderBottom: "1px solid #33342f" }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: "#F0A202", letterSpacing: "0.5px" }}>
            BITÁCORA
          </div>
          <div style={{ fontSize: 12.5, color: "#8A8577", marginTop: 2 }}>control de motos</div>
        </div>
        <div style={{ marginTop: 14 }}>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <button className={"nav-btn" + (pathname === href ? " active" : "")}>{label}</button>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: "auto", paddingTop: 20 }}>
          <button className="nav-btn" onClick={bloquear}>🔒 Bloquear panel</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: "36px 40px", maxWidth: 1000 }}>{children}</div>
    </div>
  );
}
