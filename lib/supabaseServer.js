import { createClient } from "@supabase/supabase-js";

// IMPORTANTE: este archivo usa la Service Role Key, que tiene acceso total
// a la base de datos. NUNCA se importa desde un componente de cliente
// ("use client") ni se expone al navegador — solo se usa dentro de
// app/api/**/route.js (código que corre en el servidor de Vercel).
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
