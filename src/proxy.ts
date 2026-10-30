import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Verificação otimista: a checagem real de sessão acontece nas páginas/rotas (getUserId).
export function proxy(request: NextRequest) {
  if (!request.cookies.get("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/concursos/:path*", "/meus-alvos/:path*", "/estudar/:path*", "/simulado/:path*", "/provas/:path*", "/taxonomia/:path*", "/perfil/:path*"],
};
