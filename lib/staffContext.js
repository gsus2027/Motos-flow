"use client";
import { createContext, useContext } from "react";

// Evita que cada pantalla admin-only (RequiereAdmin) tenga que pedir
// /api/auth por su cuenta, ya que el layout del panel ya lo pide una vez
// al entrar — esto quita una petición de red duplicada en cada pantalla,
// que era una de las causas de la lentitud.
const StaffContext = createContext({ staffActual: null, cargando: true });

export function StaffProvider({ value, children }) {
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaffActual() {
  return useContext(StaffContext);
}
