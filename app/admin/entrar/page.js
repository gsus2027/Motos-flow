"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EntrarPanel() {
  const router = useRouter();
  const [configurado, setConfigurado] = useState(null);
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setConfigurado(Boolean(d.configurado)))
      .catch(() => setConfigurado(false));
  }, []);

  async function crear() {
    if (v1.trim().length < 4) return setError("Usa un código de al menos 4 caracteres.");
    if (v1 !== v2) return setError("Los códigos no coinciden.");
    await enviar(v1.trim());
  }

  async function entrar() {
    await enviar(v1);
  }

  async function enviar(pin) {
    setError("");
    setEnviando(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
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

  if (configurado === null) {
    return <div style={{ padding: 40, color: "#6B6255" }}>Cargando…</div>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1C1D1F", padding: 20 }}>
      <div className="card" style={{ maxWidth: 380, width: "100%", padding: 30 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 4, color: "#22201C" }}>BITÁCORA</div>
        <div style={{ fontSize: 13, color: "#6B6255", marginBottom: 20 }}>
          {configurado
            ? "Ingresa el código de acceso del equipo para entrar al panel."
            : "Primera vez: crea un código de acceso para tu equipo. Solo quien lo tenga podrá ver el panel interno."}
        </div>

        {configurado ? (
          <>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Código de acceso</label>
              <input type="password" autoFocus value={v1} onChange={(e) => setV1(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} />
            </div>
            <button type="button" className="btn-primary" onClick={entrar} disabled={enviando} style={{ width: "100%" }}>
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Nuevo código (mín. 4 caracteres)</label>
              <input type="password" value={v1} onChange={(e) => setV1(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Repite el código</label>
              <input type="password" value={v2} onChange={(e) => setV2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && crear()} />
            </div>
            <button type="button" className="btn-primary" onClick={crear} disabled={enviando} style={{ width: "100%" }}>
              {enviando ? "Guardando…" : "Guardar código y entrar"}
            </button>
          </>
        )}
        {error && <div style={{ marginTop: 12, color: "#C0392B", fontSize: 13 }}>{error}</div>}
      </div>
    </div>
  );
}
