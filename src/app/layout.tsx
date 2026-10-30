import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { sair } from "./actions";
import { AlternarTema } from "./tema";

// Aplica o tema salvo antes da primeira pintura (evita piscar).
const SCRIPT_TEMA = "try{var t=localStorage.getItem('tema');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

export const metadata: Metadata = {
  title: "Concurso Alvo",
  description: "Encontre concursos, escolha seu alvo e estude com questões e XP.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const userId = await getUserId();
  const perfil = userId ? await prisma.perfil.findUnique({ where: { userId } }) : null;
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} /></head>
      <body>
        <nav className="top">
          <Link href="/" className="brand">🎯 Concurso Alvo</Link>
          {userId ? (
            <>
              <Link href="/concursos">Concursos</Link>
              <Link href="/meus-alvos">Meus alvos</Link>
              <Link href="/provas">Provas</Link>
              <Link href="/perfil">Nv {perfil?.nivel ?? 1} · <span className="xp">{perfil?.xpTotal ?? 0} XP</span></Link>
              <form action={sair}><button className="vermelho" type="submit">Sair</button></form>
            </>
          ) : (
            <>
              <Link href="/login">Entrar</Link>
              <Link href="/cadastro">Cadastrar</Link>
            </>
          )}
          <AlternarTema />
        </nav>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
