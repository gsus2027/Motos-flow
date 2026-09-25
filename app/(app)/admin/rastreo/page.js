"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

// Colores de estado según hace cuánto se vio la moto por última vez —
// mismos criterios que el resto del panel usa para "activa"/"devuelta".
function colorEstado(minutos) {
  if (minutos == null) return "var(--text-muted)";
  if (minutos < 20) return "#1E7A38";
  if (minutos < 120) return "#8A6100";
  return "var(--danger)";
}

function textoHaceRato(minutos) {
  if (minutos == null) return "sin datos aún";
  if (minutos < 1) return "hace segundos";
  if (minutos < 60) return `hace ${Math.round(minutos)} min`;
  const horas = Math.floor(minutos / 60);
  return `hace ${horas} h ${Math.round(minutos % 60)} min`;
}

function RastreoContenido() {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const marcadoresRef = useRef(null);
  const rutaRef = useRef(null);

  const [motos, setMotos] = useState([]);
  const [ultimas, setUltimas] = useState(new Map());
  const [motoSeleccionada, setMotoSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [f_motoId, setFMotoId] = useState("");
  const [f_lat, setFLat] = useState("");
  const [f_lon, setFLon] = useState("");
  const [formMsg, setFormMsg] = useState("");

  // Inicializa el mapa una sola vez (import dinámico: leaflet necesita
  // "window", que no existe durante el render en el servidor).
  useEffect(() => {
    let cancelado = false;
    import("leaflet").then((L) => {
      if (cancelado || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapDivRef.current).setView([9.35, -82.24], 14); // Isla Colón, Bocas del Toro
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      marcadoresRef.current = L.layerGroup().addTo(map);
      rutaRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    });
    return () => {
      cancelado = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  async function cargar() {
    const [rm, ru] = await Promise.all([
      fetch("/api/motos").then((r) => r.json()),
      fetch("/api/posiciones").then((r) => r.json()),
    ]);
    if (rm.error || ru.error) {
      setError(rm.error || ru.error);
      setCargando(false);
      return;
    }
    const conTag = (rm.motos || []).filter((m) => m.tag_id);
    setMotos(conTag);
    const mapa = new Map((ru.ultimas || []).map((p) => [p.moto_id, p]));
    setUltimas(mapa);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, []);

  // Redibuja los marcadores cada vez que cambian las motos/posiciones.
  useEffect(() => {
    const L = LRef.current;
    if (!L || !marcadoresRef.current) return;
    marcadoresRef.current.clearLayers();
    const ahora = Date.now();
    for (const m of motos) {
      const p = ultimas.get(m.id);
      if (!p) continue;
      const minutos = (ahora - new Date(p.capturado_en).getTime()) / 60000;
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 8,
        color: colorEstado(minutos),
        fillOpacity: 0.9,
        weight: 2,
      }).bindPopup(`<b>${m.placa}</b><br>${m.modelo}<br>${textoHaceRato(minutos)}`);
      marker.on("click", () => seleccionarMoto(m.id));
      marker.addTo(marcadoresRef.current);
    }
  }, [motos, ultimas]);

  async function seleccionarMoto(motoId) {
    setMotoSeleccionada(motoId);
    const L = LRef.current;
    if (!L || !rutaRef.current || !mapRef.current) return;
    const res = await fetch(`/api/posiciones?motoId=${motoId}`).then((r) => r.json());
    rutaRef.current.clearLayers();
    const puntos = res.posiciones || [];
    if (puntos.length === 0) return;
    const latlngs = puntos.map((p) => [p.lat, p.lon]);
    L.polyline(latlngs, { color: "#0071E3", weight: 3, opacity: 0.85 }).addTo(rutaRef.current);
    L.circleMarker(latlngs[0], { radius: 5, color: "#8E8E93" })
      .bindPopup(`Inicio: ${new Date(puntos[0].capturado_en).toLocaleString()}`)
      .addTo(rutaRef.current);
    L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: "#1E7A38" })
      .bindPopup(`Más reciente: ${new Date(puntos[puntos.length - 1].capturado_en).toLocaleString()}`)
      .addTo(rutaRef.current);
    mapRef.current.fitBounds(L.polyline(latlngs).getBounds(), { padding: [40, 40] });
  }

  async function registrarPosicion() {
    setFormMsg("");
    const lat = parseFloat(f_lat);
    const lon = parseFloat(f_lon);
    if (!f_motoId) return setFormMsg("Selecciona una moto.");
    if (Number.isNaN(lat) || Number.isNaN(lon)) return setFormMsg("Revisa latitud y longitud.");

    const res = await fetch("/api/posiciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motoId: f_motoId, lat, lon, fuente: "manual" }),
    }).then((r) => r.json());

    if (res.error) return setFormMsg(res.error);
    setFormMsg("Posición registrada ✓");
    setFLat("");
    setFLon("");
    cargar();
    if (motoSeleccionada === f_motoId) seleccionarMoto(f_motoId);
  }

  if (error) return <div className="card" style={{ padding: 24, color: "var(--danger)" }}>{error}</div>;

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Rastreo</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 22px" }}>
        Posición más reciente y recorrido de las motos que tienen un tag AT2501 asignado (ver &quot;Flota&quot; para asignarlo).
      </p>

      {!cargando && motos.length === 0 && (
        <div className="card" style={{ padding: 24, color: "var(--text-muted)", fontSize: 14.5, marginBottom: 20 }}>
          Ninguna moto tiene un tag_id asignado todavía. Ve a <b>Flota de motos</b> y asígnale uno a cada moto que quieras rastrear.
        </div>
      )}

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div className="card" style={{ width: 280, flexShrink: 0, overflow: "hidden" }}>
          {motos.map((m) => {
            const p = ultimas.get(m.id);
            const minutos = p ? (Date.now() - new Date(p.capturado_en).getTime()) / 60000 : null;
            return (
              <div
                key={m.id}
                onClick={() => seleccionarMoto(m.id)}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  background: motoSeleccionada === m.id ? "var(--highlight-bg)" : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: colorEstado(minutos), flexShrink: 0 }} />
                  {m.placa} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>· {m.modelo}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>
                  {m.plataforma === "android" ? "Android" : "iPhone"} · {textoHaceRato(minutos)}
                </div>
              </div>
            );
          })}

          <div style={{ padding: 16 }}>
            <div className="seccion-titulo" style={{ marginBottom: 10 }}>Registrar posición manual</div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Moto</label>
              <select value={f_motoId} onChange={(e) => setFMotoId(e.target.value)}>
                <option value="">Selecciona…</option>
                {motos.map((m) => (
                  <option key={m.id} value={m.id}>{m.placa} — {m.modelo}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Latitud</label>
              <input value={f_lat} onChange={(e) => setFLat(e.target.value)} placeholder="Ej: 9.3500" />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Longitud</label>
              <input value={f_lon} onChange={(e) => setFLon(e.target.value)} placeholder="Ej: -82.2400" />
            </div>
            <button type="button" className="btn-primary" style={{ width: "100%", padding: "10px 0" }} onClick={registrarPosicion}>
              Guardar posición
            </button>
            {formMsg && (
              <div style={{ marginTop: 8, fontSize: 13, color: formMsg.includes("✓") ? "#1E7A38" : "var(--danger)" }}>{formMsg}</div>
            )}
          </div>
        </div>

        <div ref={mapDivRef} className="card" style={{ flex: 1, minWidth: 320, height: 560 }} />
      </div>
    </div>
  );
}

export default function Rastreo() {
  return <RastreoContenido />;
}
