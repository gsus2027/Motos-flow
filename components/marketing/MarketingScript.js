"use client";
import { useEffect } from "react";

// El sitio original es HTML/CSS/JS "de toda la vida" (no React). En vez de
// reescribir esa lógica a mano (arriesgando romper algo), la ejecutamos tal
// cual, igual que se ejecutaría en cualquier página normal — esto agrega
// el <script> al documento ya montado, que es el único momento en que el
// código puede correr con seguridad dentro de una página de Next.js.
export default function MarketingScript({ code }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.text = code;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [code]);

  return null;
}
