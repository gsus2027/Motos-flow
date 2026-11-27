"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// 27-nov-2026: el formulario del cliente pedía cada lista (motos, ebikes,
// equipo, precios, extras) UNA sola vez. Si esa petición fallaba —señal
// débil, el servidor "despertando", un error momentáneo de la base de
// datos— la lista quedaba vacía sin aviso y la única salida era recargar
// la página (y perder lo escrito). Aquí: reintentos automáticos, aviso
// con botón "Reintentar" y borrador guardado en el propio teléfono.

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// GET con reintentos (0.8s, 1.6s, 3.2s…) y límite de tiempo por intento.
// Una respuesta 4xx/5xx también cuenta como fallo.
export async function pedirJSON(url, { intentos = 4, espera = 800, limite = 12000, alIntentar } = {}) {
  let ultimo;
  for (let i = 1; i <= intentos; i++) {
    alIntentar?.(i);
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const reloj = ctrl ? setTimeout(() => ctrl.abort(), limite) : null;
    try {
      const r = await fetch(url, { cache: "no-store", signal: ctrl?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (err) {
      ultimo = err;
    } finally {
      if (reloj) clearTimeout(reloj);
    }
    if (i < intentos) await esperar(espera * 2 ** (i - 1));
  }
  throw ultimo || new Error("No se pudo cargar");
}

// Vuelve a intentar sola cuando el teléfono recupera la señal o el
// cliente regresa a la página (p. ej. después de tomar la foto).
export function useAlVolver(reintentar, activo) {
  const ref = useRef(reintentar);
  ref.current = reintentar;
  useEffect(() => {
    if (!activo || typeof window === "undefined") return undefined;
    const alVolver = () => {
      if (document.visibilityState === "visible") ref.current();
    };
    const enLinea = () => ref.current();
    window.addEventListener("online", enLinea);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener("online", enLinea);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [activo]);
}

// Carga una URL con reintentos. Devuelve { datos, cargando, error, intento, reintentar }.
export function useCargaSegura(url) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: false, intento: 0 });
  const [vuelta, setVuelta] = useState(0);
  const reintentar = useCallback(() => setVuelta((v) => v + 1), []);

  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true, error: false }));
    pedirJSON(url, { alIntentar: (i) => vigente && setEstado((e) => ({ ...e, intento: i })) })
      .then((datos) => vigente && setEstado({ datos, cargando: false, error: false, intento: 0 }))
      .catch(() => vigente && setEstado((e) => ({ ...e, cargando: false, error: true })));
    return () => {
      vigente = false;
    };
  }, [url, vuelta]);

  useAlVolver(reintentar, estado.error);
  return { ...estado, reintentar };
}

// Borrador del formulario en el propio teléfono (sessionStorage: solo
// esta pestaña, se borra al cerrarla). Sobrevive a una recarga. Vence a
// las 2 horas para que un formulario abandonado no le aparezca a otro
// cliente. Nunca guarda la foto del carnet ni la firma.
const VENCE_MS = 2 * 60 * 60 * 1000;

export function useBorrador(clave, valores, restaurar) {
  const [recuperado, setRecuperado] = useState(false);
  const listo = useRef(false);
  const restaurarRef = useRef(restaurar);
  restaurarRef.current = restaurar;

  useEffect(() => {
    try {
      const crudo = window.sessionStorage.getItem(clave);
      if (crudo) {
        const { guardado, datos } = JSON.parse(crudo);
        if (Date.now() - guardado < VENCE_MS && datos) {
          restaurarRef.current(datos);
          setRecuperado(true);
        } else {
          window.sessionStorage.removeItem(clave);
        }
      }
    } catch {
      // sin almacenamiento disponible (modo privado, etc.): seguimos sin borrador
    }
    listo.current = true;
  }, [clave]);

  const json = JSON.stringify(valores);
  useEffect(() => {
    if (!listo.current) return undefined;
    const t = setTimeout(() => {
      try {
        window.sessionStorage.setItem(clave, JSON.stringify({ guardado: Date.now(), datos: JSON.parse(json) }));
      } catch {
        // ignorar
      }
    }, 400);
    return () => clearTimeout(t);
  }, [clave, json]);

  const borrar = useCallback(() => {
    try {
      window.sessionStorage.removeItem(clave);
    } catch {
      // ignorar
    }
    setRecuperado(false);
  }, [clave]);

  return { recuperado, borrar };
}
