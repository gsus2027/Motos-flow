import { NextResponse } from "next/server";
import { tokenValido, SESSION_COOKIE_NAME } from "@/lib/session";

// Este middleware corre en el servidor de Vercel ANTES de que se sirva
// cualquier página bajo /admin. Si la cookie de sesión no es válida,
// redirige a /admin/entrar en vez de mostrar el panel — esto es
// seguridad real (no se puede saltar editando el código del navegador,
// a diferencia de la versión anterior en el artefacto de Claude).
export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/entrar") {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!(await tokenValido(token))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/entrar";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
