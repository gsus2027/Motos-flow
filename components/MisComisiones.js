"use client";
import { useEffect, useState } from "react";

function formatoDia(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function dinero(n) {
  return "$" + Number(n || 0).toFixed(2);
}

// Tarjeta del miembro conectado: lo que le falta por cobrar, lo de hoy,
// su progreso hacia la meta del día y el detalle SOLO de los días que
// todavía no se le han pagado. Los días ya pagados desaparecen; el
// equipo no ve pagos, historial ni montos rentados.
export default function MisComisiones({ vacio } = {}) {
  const [datos, setDatos] = useState(null);
  const [verTodo, setVerTodo] = useState(false);

  useEffect(() => {
    fetch("/api/comisiones")
      .then((r) => r.json())
      .then((d) => setDatos(d))
      .catch(() => setDatos({ error: true }));
  }, []);

  if (!datos) return <div style={{ color: "var(--text-muted)" }}>Cargando…</div>;
  if (datos.error || datos.comisiona === false) {
    return vacio ? <div className="card" style={{ padding: "18px 20px", maxWidth: 620, color: "var(--text-muted)", fontSize: 14.5 }}>{vacio}</div> : null;
  }

  const { mio, config, hoy } = datos;
  const dias = mio?.dias || [];
  const deHoy = mio?.hoy;
  const comisionHoy = deHoy?.comision || 0;
  const meta = Number(config?.metaComision || 0);
  const cumplida = Boolean(deHoy?.llegoMeta);
  const progreso = meta > 0 ? (cumplida ? 100 : Math.min(99, Math.round((comisionHoy / meta) * 100))) : 0;
  const falta = cumplida ? 0 : Math.max(0, Math.round((meta - comisionHoy) * 100) / 100);
  const visibles = verTodo ? dias : dias.slice(0, 6);

  return (
    <div className="card" style={{ padding: "18px 20px", marginBottom: 26, maxWidth: 620 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 16 }}>Tus comisiones</span>
        {mio?.pendienteDesde && <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Pendiente desde {formatoDia(mio.pendienteDesde)}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, margin: "14px 0" }}>
        <div style={{ background: "var(--panel-2)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Por cobrar</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#245939" }}>{dinero(mio?.porCobrar)}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{mio?.bonosPendientes > 0 ? `incluye ${dinero(mio.bonosPendientes)} en bonos` : "en comisiones"}</div>
        </div>
        <div style={{ background: "var(--panel-2)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Hoy</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{dinero(deHoy?.total)}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{deHoy?.bono > 0 ? `incluye bono de ${dinero(deHoy.bono)}` : "en comisión"}</div>
        </div>
      </div>

      {meta > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
            <span>Meta del día: {dinero(meta)} en comisión</span>
            <span style={{ color: falta === 0 ? "#245939" : "var(--text-muted)", fontWeight: falta === 0 ? 600 : 400 }}>
              {falta === 0 ? "¡Meta cumplida!" : `te faltan ${dinero(falta)}`}
            </span>
          </div>
          <div style={{ height: 8, background: "var(--panel-2)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${progreso}%`, height: "100%", background: falta === 0 ? "#3F7D58" : "#F0A202", transition: "width .4s" }} />
          </div>
          {Number(config?.bono) > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {falta === 0 ? `Ganaste el bono de ${dinero(config.bono)} hoy.` : `Si llegas a la meta ganas un bono de ${dinero(config.bono)}.`}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Detalle de lo que falta por cobrar</div>
      {dias.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "6px 0" }}>No tienes comisiones pendientes por cobrar.</div>
      ) : (
        <div style={{ fontSize: 13 }}>
          {visibles.map((d) => (
            <div key={d.fecha} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--border)", gap: 8 }}>
              <span>
                {d.fecha === hoy ? "Hoy" : formatoDia(d.fecha)}
                {d.parcial ? (
                  <span style={{ fontSize: 11, fontWeight: 600, background: "#FAEEDA", color: "#854F0B", padding: "1px 6px", borderRadius: 6, marginLeft: 6 }}>resto del día</span>
                ) : (
                  d.llegoMeta && (
                    <span style={{ fontSize: 11, fontWeight: 600, background: "#DCEAE1", color: "#245939", padding: "1px 6px", borderRadius: 6, marginLeft: 6 }}>
                      meta + {dinero(d.bono)}
                    </span>
                  )
                )}
              </span>
              <strong>{dinero(d.pendiente)}</strong>
            </div>
          ))}
          {dias.length > 6 && (
            <button type="button" onClick={() => setVerTodo((v) => !v)} style={{ background: "none", border: "none", padding: "6px 0 0", color: "var(--amber)", fontSize: 12.5, cursor: "pointer" }}>
              {verTodo ? "Ver menos" : `Ver ${dias.length - 6} días más`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
