"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EntrarPanel() {
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        setStaff(d.staff || []);
        if ((d.staff || []).length > 0) setStaffId(d.staff[0].id);
      })
      .catch(() => setStaff([]));
  }, []);

  async function primerRegistro() {
    if (!nombreNuevo.trim()) return setError("Escribe tu nombre.");
    if (pin.trim().length < 4) return setError("Usa un PIN de al menos 4 caracteres.");
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1C1D1F", padding: 20 }}>
      <div className="card" style={{ maxWidth: 380, width: "100%", padding: 30 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 4, color: "var(--text)" }}>FLOW RENTALS</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
          {hayEquipo
            ? "Elige tu nombre e ingresa tu PIN para entrar al panel."
            : "Primera vez configurando el panel: crea tu cuenta. Después, desde \"Equipo\", puedes agregar a los demás."}
        </div>

        {hayEquipo ? (
          <>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Tu nombre</label>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Tu PIN</label>
              <input type="password" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} />
            </div>
            <button type="button" className="btn-primary" onClick={entrar} disabled={enviando} style={{ width: "100%" }}>
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Tu nombre</label>
              <input value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Crea tu PIN (mín. 4 caracteres)</label>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && primerRegistro()} />
            </div>
            <button type="button" className="btn-primary" onClick={primerRegistro} disabled={enviando} style={{ width: "100%" }}>
              {enviando ? "Guardando…" : "Crear mi cuenta y entrar"}
            </button>
          </>
        )}
        {error && <div style={{ marginTop: 12, color: "#F3A9A4", fontSize: 13 }}>{error}</div>}
      </div>
    </div>
  );
}
