import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { perfilDoCargo } from "@/lib/prova-cargo";
import { Estudo } from "./estudo";

export default async function Estudar(props: PageProps<"/estudar/[alvoId]">) {
  const { alvoId } = await props.params;
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const alvo = await prisma.alvo.findFirst({ where: { id: alvoId, userId }, include: { cargo: { include: { concurso: true } } } });
  if (!alvo) notFound();
  const perfil = await perfilDoCargo(alvo.cargoId);
  const pc = await prisma.progressoCargo.findUnique({ where: { userId_cargoId: { userId, cargoId: alvo.cargoId } } });
  const progs = await prisma.progressoTopico.findMany({ where: { userId, cargoId: alvo.cargoId, disciplina: "comp" } });
  const dom = new Map(progs.map((p) => [p.topico, p.dominio]));
  // Quantas questões inéditas existem por competência (para o usuário saber onde há material).
  const ids = perfil.itens.map((i) => i.competencia);
  const grupos = await prisma.questaoProva.groupBy({
    by: ["competencia"],
    where: { competencia: { in: ids }, anulada: false, correta: { not: null }, dependeDeApoio: false, prova: { status: "ok" }, respostas: { none: { userId } } },
    _count: true,
  });
  const disp = new Map(grupos.map((g) => [g.competencia, g._count]));
  const itens = perfil.itens.map((i) => ({ ...i, dominio: dom.get(i.competencia) ?? 0, disponiveis: disp.get(i.competencia) ?? 0 }));
  return (
    <>
      <h1>{alvo.cargo.nome}</h1>
      <p className="mut">
        {alvo.cargo.concurso.orgao} · perfil {perfil.fonte === "edital" ? "do edital" : perfil.fonte === "historico" ? "de editais anteriores" : "padrão de TI"} ·{" "}
        <Link href={`/simulado/${alvoId}`}>Fazer simulado</Link>
      </p>
      <Estudo alvoId={alvo.id} itens={itens} xpInicial={pc?.xp ?? 0} profInicial={pc?.proficiencia ?? 0} />
    </>
  );
}
