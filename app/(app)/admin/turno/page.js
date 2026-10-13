"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { METODO_COBRO_LABELS } from "@/lib/cobros";

// Cerrar mi turno (13-oct-2026, etapa 3 del cuadre de pagos): lo que se
// cobró durante el turno por método, cuánto efectivo debe haber, y el
// conteo de quien cierra. Al cerrar, la sesión se cierra sola.

function dinero(n) {
  return "$" + (Math.round(Number(n || 0) * 100) / 100).toFixed(2);
}
function hora(iso) {
  return iso ? new Date(iso).toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit", timeZone: "America/Panama" }) : "";
}
function Fila({ izq, der, fuerte }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", fontWeight: fuerte ? 700 : 400, borderTop: fuerte ? "1px solid var(--border)" : "none", marginTop: fuerte ? 6 : 0, paddingTop: fuerte ? 10 : 4 }}>
      <span>{izq}</span>
      <span>{der}</span>
    </div>
  );
}

export default function CerrarTurno() {
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [contado, setContado] = useState("");
  const [salidas, setSalidas] = useState("");
  const [salidasNota, setSalidasNota] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch("/api/turnos")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ error: "No se pudo cargar." }));
  }, []);

  async function cerrar() {
    if (String(contado).trim() === "") return setError("Escribe cuánto efectivo contaste.");
    if (Number(salidas) > 0 && !salidasNota.trim()) return setError("Escribe en qué se usó el efectivo que salió.");
    setGuardando(true);
    setError("");
    const res = await fetch("/api/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "cerrar", contado, salidas, salidasNota, nota }),
    })
      .then((x) => x.json())
      .catch(() => ({ error: "No se pudo guardar. Revisa tu conexión." }));
    if (res.error) {
      setGuardando(false);
      return setError(res.error);
    }
    router.push("/admin/entrar?motivo=turno");
  }

  if (!info) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;
  if (info.sinTabla) return <div className="card" style={{ padding: 20 }}>Todavía no está activado el control de turnos (falta correr supabase-schema-turnos.sql en Supabase).</div>;
  if (info.error) return <div className="card" style={{ padding: 20 }}>{info.error}</div>;
  if (!info.esMio) {
    return (
      <div className="card" style={{ padding: 20 }}>
        No tienes un turno abierto.{info.turno ? ` El turno abierto es de ${info.turno.usuario_nombre}.` : ""}
      </div>
    );
  }

  const r = info.resumen;
  const esperado = Math.round((r.fondo + r.efectivo - (Number(String(salidas).replace(",", ".")) || 0)) * 100) / 100;
  const contadoNum = Number(String(contado).replace(/[$\s]/g, "").replace(",", "."));
  const diferencia = String(contado).trim() !== "" && Number.isFinite(contadoNum) ? Math.round((contadoNum - esperado) * 100) / 100 : null;

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Cerrar mi turno</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 22px" }}>Desde las {hora(info.turno.abierto_en)}.</p>

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", alignItems: "start" }}>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Lo que se cobró en el turno</div>
          {Object.keys(r.porMetodo).length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Todavía no hay cobros.</div>}
          {Object.entries(r.porMetodo).map(([m, v]) => (
            <Fila key={m} izq={`${METODO_COBRO_LABELS[m] || m} · ${v.cantidad}`} der={dinero(v.monto)} />
          ))}
          <div style={{ fontWeight: 600, margin: "18px 0 8px" }}>Caja</div>
          <Fila izq="Fondo con que empezaste" der={dinero(r.fondo)} />
          <Fila izq="+ Efectivo cobrado" der={dinero(r.efectivo)} />
          {Number(salidas) > 0 && <Fila izq="− Salidas" der={dinero(salidas)} />}
          <Fila izq="Debe haber" der={dinero(esperado)} fuerte />
        </div>

        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="cerrar-contado">¿Cuánto efectivo contaste?</label>
            <input id="cerrar-contado" inputMode="decimal" placeholder="0.00" value={contado} onChange={(e) => setContado(e.target.value)} style={{ fontSize: 24, fontWeight: 600 }} />
            {diferencia !== null && (
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: Math.abs(diferencia) < 0.005 ? "#1E7A38" : "var(--warning-text)" }}>
                {Math.abs(diferencia) < 0.005 ? "Cuadra" : diferencia > 0 ? `Sobran ${dinero(diferencia)}` : `Faltan ${dinero(-diferencia)}`}
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", gap: 10 }}>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="cerrar-salidas">Salidas (opcional)</label>
              <input id="cerrar-salidas" inputMode="decimal" placeholder="0.00" value={salidas} onChange={(e) => setSalidas(e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="cerrar-salidas-nota">¿En qué?</label>
              <input id="cerrar-salidas-nota" placeholder="Ej. gasolina, depósito" value={salidasNota} onChange={(e) => setSalidasNota(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="cerrar-nota">Nota (opcional)</label>
            <input id="cerrar-nota" placeholder="Algo que deba saber el siguiente turno" value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>
          {error && <div style={{ color: "var(--danger-text)", fontSize: 13.5 }}>{error}</div>}
          <button type="button" className="btn-primary" onClick={cerrar} disabled={guardando} style={{ minHeight: 52 }}>
            {guardando ? "Cerrando…" : "Cerrar turno y entregar caja"}
          </button>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Al cerrar, tu sesión se cierra sola. Lo que cuentes es lo que recibe el siguiente turno.</div>
        </div>
      </div>
    </div>
  );
}
