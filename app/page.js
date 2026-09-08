import Link from "next/link";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1C1D1F", padding: 20 }}>
      <div className="card" style={{ maxWidth: 380, width: "100%", padding: 34, textAlign: "center" }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: "#22201C", marginBottom: 4 }}>
          BITÁCORA
        </div>
        <div style={{ fontSize: 13, color: "#6B6255", marginBottom: 26 }}>¿Quién eres?</div>
        <Link href="/rentar" style={{ display: "block", textDecoration: "none" }}>
          <button type="button" className="btn-primary" style={{ width: "100%", marginBottom: 10, padding: "13px 18px" }}>
            Soy cliente, quiero rentar una moto
          </button>
        </Link>
        <Link href="/admin" style={{ display: "block", textDecoration: "none" }}>
          <button type="button" className="btn-secondary" style={{ width: "100%", padding: "11px 18px" }}>
            Soy del equipo / administración
          </button>
        </Link>
      </div>
    </div>
  );
}
