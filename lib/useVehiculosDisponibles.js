"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { pedirJSON, useAlVolver } from "@/lib/cargaSegura";

function formatoDia(iso) {
  const [y, m, d] = String(iso).split("-");
  return `${d}/${m}/${y}`;
}

// Lista de motos o ebikes libres EN LAS FECHAS del formulario. Se vuelve a
// pedir cada vez que cambian las fechas. Si el vehículo que ya se había
// elegido deja de estar libre (choca con una reserva), se avisa con
// onPerdido(vehiculoAnterior) para que el formulario lo quite.
export function useVehiculosDisponibles({ tipo, fechaEntrega, fechaPrevista, seleccionadoId, onPerdido }) {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [vuelta, setVuelta] = useState(0);
  const reintentar = useCallback(() => setVuelta((v) => v + 1), []);
  const ref = useRef({});
  ref.current = { lista, seleccionadoId, onPerdido };

  const desde = fechaEntrega;
  const hasta = fechaPrevista && fechaPrevista > fechaEntrega ? fechaPrevista : fechaEntrega;

  useEffect(() => {
    if (!desde) return undefined;
    let vigente = true;
    setCargando(true);
    setError(false);
    const url = `/api/${tipo === "ebike" ? "ebikes" : "motos"}?disponibles=1&desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    // Con reintentos: si falla no se deja la lista vacía en silencio.
    pedirJSON(url, { alIntentar: (i) => vigente && setIntento(i) })
      .then((d) => {
        if (!vigente) return;
        const nueva = (tipo === "ebike" ? d.ebikes : d.motos) || [];
        const { seleccionadoId: elegido, lista: anterior, onPerdido: avisar } = ref.current;
        if (elegido && !nueva.some((v) => v.id === elegido)) {
          avisar?.(anterior.find((v) => v.id === elegido) || null);
        }
        setLista(nueva);
        setCargando(false);
        setIntento(0);
      })
      .catch(() => {
        if (!vigente) return;
        setCargando(false);
        setError(true);
      });
    return () => {
      vigente = false;
    };
  }, [tipo, desde, hasta, vuelta]);

  useAlVolver(reintentar, error);
  return { lista, cargando, error, intento, reintentar };
}

// " · devolver antes del 09/01/2027" para los que tienen una reserva después.
export function notaReserva(vehiculo, idioma) {
  if (!vehiculo?.reservadaDesde) return "";
  return idioma === "en"
    ? ` · return before ${formatoDia(vehiculo.reservadaDesde)}`
    : ` · devolver antes del ${formatoDia(vehiculo.reservadaDesde)}`;
}

export function avisoNoDisponible(nombre, idioma) {
  return idioma === "en"
    ? `${nombre || "The vehicle you chose"} is not available on those dates (it has another booking). Please choose another one or change the dates.`
    : `${nombre || "El vehículo que elegiste"} no está libre en esas fechas (tiene otra reserva). Elige otro o cambia las fechas.`;
}
