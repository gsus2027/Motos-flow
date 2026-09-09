"use client";
import { useEffect, useState } from "react";

// Recibe la RUTA guardada (ej. "carnets/uuid.jpg"), pide un link temporal
// al servidor (que valida que ya entraste con el código del panel), y
// muestra la imagen. Si no hay ruta, o falla, muestra un recuadro vacío.
export default function ImagenPrivada({ path, alt, style }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setUrl(null);
    setError(false);
    if (!path) return;
    fetch(`/api/imagen-firmada?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((d) => (d.url ? setUrl(d.url) : setError(true)))
      .catch(() => setError(true));
  }, [path]);

  if (!path || error || !url) {
    return <div style={{ ...style, background: "#F3EEE2" }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} style={style} />;
}
