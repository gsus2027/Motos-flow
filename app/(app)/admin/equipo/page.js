"use client";
import RequiereAdmin from "@/components/RequiereAdmin";
import { useEffect, useState } from "react";

function formatoFecha(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-PA", { dateStyle: "medium" });
}

function PantallaEquipoContenido() {
  const [staff, setStaff] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [reseteo, setReseteo] = useState({}); // { [id]: "nuevo pin" }

  function cargar() {
    setCargando(true);
    fetch("/api/staff")
      .then((r) => r.json())
      .then((d) => {
        setStaff(d.staff || []);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function agregar() {
    setError("");
    setMensaje("");
    if (!nombre.trim()) return setError("Escribe el nombre de la persona.");
    if (pin.trim().length < 4) return setError("El PIN debe tener al menos 6 caracteres.");
    setGuardando(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), pin: pin.trim() }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setNombre("");
      setPin("");
      setMensaje(`${res.staff.nombre} fue agregado al equipo.`);
      cargar();
    } catch (err) {
      setError(err.message || "No se pudo agregar.");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarActivo(s, activo) {
    setError("");
    setMensaje("");
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, activo }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      cargar();
    } catch (err) {
      setError(err.message || "No se pudo actualizar.");
    }
  }

  async function cambiarAdmin(s, esAdmin) {
    setError("");
    setMensaje("");
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, esAdmin }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      cargar();
    } catch (err) {
      setError(err.message || "No se pudo actualizar.");
    }
  }

  async function restablecerPin(s) {
    const nuevoPin = (reseteo[s.id] || "").trim();
    setError("");
    setMensaje("");
    if (nuevoPin.length < 4) return setError(`El nuevo PIN de ${s.nombre} debe tener al menos 6 caracteres.`);
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, pin: nuevoPin }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setReseteo((r) => ({ ...r, [s.id]: "" }));
      setMensaje(`Se actualizó el PIN de ${s.nombre}.`);
    } catch (err) {
      setError(err.message || "No se pudo cambiar el PIN.");
    }
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 600, margin: 0 }}>Equipo</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>
        Cada persona entra con su propio nombre y PIN. Desactiva a alguien si deja el equipo — no borra su historial.
      </p>

      <div className="card" style={{ padding: 22, maxWidth: 620, marginBottom: 22 }}>
        <div className="seccion-titulo">Agregar a alguien</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="field">
            <label>PIN (mín. 6 caracteres)</label>
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="button" className="btn-primary" onClick={agregar} disabled={guardando}>
            {guardando ? "Agregando…" : "Agregar al equipo"}
          </button>
        </div>
      </div>

      {mensaje && (
        <div style={{ marginBottom: 18, background: "#E8F7ED", color: "#1E7A38", padding: 11, borderRadius: 6, fontSize: 13.5, maxWidth: 620 }}>{mensaje}</div>
      )}
      {error && (
        <div style={{ marginBottom: 18, background: "var(--danger-bg)", color: "var(--danger-text)", padding: 11, borderRadius: 6, fontSize: 13.5, maxWidth: 620 }}>{error}</div>
      )}

      <div className="card" style={{ padding: 0, maxWidth: 620, overflow: "hidden" }}>
        {cargando ? (
          <div style={{ padding: 20, color: "var(--text-muted)" }}>Cargando…</div>
        ) : (
          staff.map((s, i) => (
            <div key={s.id} style={{ padding: "16px 18px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                    {s.nombre}{" "}
                    {s.es_admin && <span style={{ color: "var(--amber)", fontWeight: 700, fontSize: 12 }}>· Administrador</span>}{" "}
                    {!s.activo && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(inactivo)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Desde {formatoFecha(s.creado_en)}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => cambiarAdmin(s, !s.es_admin)}>
                    {s.es_admin ? "Quitar admin" : "Hacer admin"}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => cambiarActivo(s, !s.activo)}>
                    {s.activo ? "Desactivar" : "Reactivar"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input
                  type="password"
                  placeholder="Nuevo PIN"
                  value={reseteo[s.id] || ""}
                  onChange={(e) => setReseteo((r) => ({ ...r, [s.id]: e.target.value }))}
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "1.5px solid var(--border)", background: "var(--panel-2)", color: "var(--text)", fontSize: 13.5 }}
                />
                <button type="button" className="btn-secondary" onClick={() => restablecerPin(s)}>
                  Cambiar PIN
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function PantallaEquipo() {
  return (
    <RequiereAdmin>
      <PantallaEquipoContenido />
    </RequiereAdmin>
  );
}
