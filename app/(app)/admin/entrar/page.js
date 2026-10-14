"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { colorDeStaff, inicial } from "@/lib/colorStaff";

// 13-oct-2026: el nombre ya no viene preseleccionado (antes quedaba elegido
// el primero de la lista, y era fácil entrar con el nombre de otro). Cada
// quien toca su nombre, con su color, y escribe su PIN.
const AVISOS = {
  inactivo: "La sesión se cerró sola después de 20 minutos sin uso.",
  cambio: "Sesión cerrada. Toca tu nombre para entrar.",
  turno: "Turno cerrado. El siguiente entra con su nombre.",
};

export default function EntrarPanel() {
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        setStaff(d.staff || []);
      })
      .catch(() => setStaff([]));
    try {
      const motivo = new URLSearchParams(window.location.search).get("motivo");
      if (AVISOS[motivo]) setAviso(AVISOS[motivo]);
    } catch {
      // sin aviso
    }
  }, []);

  async function primerRegistro() {
    if (!nombreNuevo.trim()) return setError("Escribe tu nombre.");
    if (pin.trim().length < 4) return setError("Usa un PIN de al menos 6 caracteres.");
    await enviar({ crear: true, nombre: nombreNuevo.trim(), pin: pin.trim() });
  }

  async function entrar() {
    if (!staffId) return setError("Elige tu nombre.");
    await enviar({ staffId, pin });
  }

  async function enviar(body) {
    setError("");
    setEnviando(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (staff === null) {
    return <div style={{ padding: 40, color: "var(--text-muted)" }}>Cargando…</div>;
  }

  const hayEquipo = staff.length > 0;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--panel-2)", padding: 20 }}>
      <div className="card" style={{ maxWidth: 460, width: "100%", padding: 30 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, marginBottom: 4, color: "var(--text)" }}>Flow Rentals</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
          {hayEquipo
            ? "Elige tu nombre e ingresa tu PIN para entrar al panel."
            : "Primera vez configurando el panel: crea tu cuenta. Después, desde \"Equipo\", puedes agregar a los demás."}
        </div>

        {aviso && (
          <div style={{ background: "var(--highlight-bg)", color: "var(--text)", border: "1px solid var(--highlight-border)", borderRadius: 12, padding: "10px 12px", fontSize: 13.5, marginBottom: 16 }}>{aviso}</div>
        )}

        {hayEquipo ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }} id="quien-titulo">¿Quién está atendiendo?</div>
            <div role="radiogroup" aria-labelledby="quien-titulo" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10, marginBottom: 18 }}>
              {staff.map((s) => {
                const elegido = staffId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    onClick={() => {
                      setStaffId(s.id);
                      setPin("");
                      setError("");
                    }}
                    style={{
                      minHeight: 92,
                      borderRadius: 14,
                      border: elegido ? `3px solid ${colorDeStaff(s.id)}` : "1px solid var(--border)",
                      background: elegido ? "var(--panel-2)" : "var(--panel)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      cursor: "pointer",
                      padding: 8,
                      color: "var(--text)",
                    }}
                  >
                    <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: "50%", background: colorDeStaff(s.id), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 }}>
                      {inicial(s.nombre)}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: elegido ? 600 : 500 }}>{s.nombre}</span>
                  </button>
                );
              })}
            </div>
            {staffId && (
              <>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label htmlFor="entrar-pin">PIN de {staff.find((s) => s.id === staffId)?.nombre}</label>
                  <input id="entrar-pin" type="password" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} />
                </div>
                <button type="button" className="btn-primary" onClick={entrar} disabled={enviando} style={{ width: "100%" }}>
                  {enviando ? "Entrando…" : "Entrar"}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Tu nombre</label>
              <input value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Crea tu PIN (mín. 6 caracteres)</label>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && primerRegistro()} />
            </div>
            <button type="button" className="btn-primary" onClick={primerRegistro} disabled={enviando} style={{ width: "100%" }}>
              {enviando ? "Guardando…" : "Crear mi cuenta y entrar"}
            </button>
          </>
        )}
        {error && <div style={{ marginTop: 12, color: "var(--danger-text)", fontSize: 13 }}>{error}</div>}
      </div>
    </div>
  );
}
