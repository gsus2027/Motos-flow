import Link from "next/link";

function IconMoto() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M6 18l4-7h5l3 7M10 11l3-4h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 2L4.5 14H12l-1 8L20 10h-8l1-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="v2" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="v2-card" style={{ maxWidth: 340, width: "100%", padding: "34px 28px" }}>
        <div className="v2-brand" style={{ fontSize: 24, color: "var(--text)", marginBottom: 4 }}>
          FLOW RENTALS
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 26 }}>¿Qué quieres rentar?</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/rentar" style={{ textDecoration: "none" }}>
            <button type="button" className="v2-btn-moto">
              <IconMoto />
              Rentar una moto
            </button>
          </Link>
          <Link href="/rentar-ebike" style={{ textDecoration: "none" }}>
            <button type="button" className="v2-btn-ebike">
              <IconBolt />
              Rentar una ebike
            </button>
          </Link>
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <button type="button" className="v2-btn-ghost">
              Soy del equipo / administración →
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
