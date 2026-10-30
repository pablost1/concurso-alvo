import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";

export default async function Home() {
  if (await getUserId()) redirect("/concursos");
  return (
    <div className="card">
      <h1>Seu próximo concurso começa aqui</h1>
      <p>Acompanhe editais abertos em todo o Brasil, filtre por área (como Tecnologia/Programação), escolha o cargo-alvo e estude só o que cai na sua prova — com questões e XP.</p>
      <div className="row">
        <Link className="btn verde" href="/cadastro">Criar conta</Link>
        <Link className="btn azul" href="/login">Entrar</Link>
      </div>
    </div>
  );
}
