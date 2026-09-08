"use client";
import { useRef, useState, useEffect } from "react";

export default function FirmaPad({ onChange, limpiarTexto }) {
  const canvasRef = useRef(null);
  const dibujando = useRef(false);
  const [vacio, setVacio] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
  }, []);

  function coords(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function iniciar(e) {
    e.preventDefault();
    dibujando.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = coords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function mover(e) {
    if (!dibujando.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = coords(e, canvas);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    setVacio(false);
  }
  function terminar() {
    if (!dibujando.current) return;
    dibujando.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  }
  function limpiar() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setVacio(true);
    onChange("");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: 150, border: "1.5px solid #D8CFBC", borderRadius: 4, background: "#fff", touchAction: "none", cursor: "crosshair", display: "block" }}
        onMouseDown={iniciar}
        onMouseMove={mover}
        onMouseUp={terminar}
        onMouseLeave={terminar}
        onTouchStart={iniciar}
        onTouchMove={mover}
        onTouchEnd={terminar}
      />
      <button type="button" className="btn-secondary" onClick={limpiar} disabled={vacio} style={{ marginTop: 8, opacity: vacio ? 0.5 : 1 }}>
        {limpiarTexto}
      </button>
    </div>
  );
}
