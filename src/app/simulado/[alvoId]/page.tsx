import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { contarDisponiveis } from "@/lib/provas/simulado";
import { Simulado } from "./simulado";

const FONTE = {
  edital: "do edital deste concurso",
  historico: "da média de editais anteriores do mesmo cargo",
  padrao: "padrão de TI (leia o edital para um perfil mais fiel)",
} as const;

export default async function SimuladoPage(props: PageProps<"/simulado/[alvoId]">) {
  const { alvoId } = await props.params;
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const alvo = await prisma.alvo.findFirst({ where: { id: alvoId, userId }, include: { cargo: { include: { concurso: true } } } });
  if (!alvo) notFound();
  const cont = await contarDisponiveis(userId, alvoId);
  const totalQuestoes = await prisma.questaoProva.count({ where: { prova: { status: "ok" } } });
  return (
    <>
      <h1>Simulado · {alvo.cargo.nome}</h1>
      <p className="mut">
        {alvo.cargo.concurso.orgao} · competências {cont ? FONTE[cont.fonte] : ""}
      </p>
      {totalQuestoes === 0 && (
        <div className="card">
          Ainda não há provas anteriores no banco. <Link href="/provas">Coletar ou importar provas</Link>.
        </div>
      )}
      <Simulado alvoId={alvoId} cargo={cont?.cargo ?? 0} concurso={cont?.concurso ?? 0} cruzado={cont?.cruzado ?? 0} />
    </>
  );
}
