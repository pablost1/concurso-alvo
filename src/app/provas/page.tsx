import Link from "next/link";
import { prisma } from "@/lib/db";
import { PainelProvas } from "./painel";

export default async function Provas() {
  const [porStatus, questoes, tiQ, classificadas, porBanca, erros, editais, eventos] = await Promise.all([
    prisma.prova.groupBy({ by: ["status"], _count: true }),
    prisma.questaoProva.count(),
    prisma.questaoProva.count({ where: { prova: { ti: true } } }),
    prisma.questaoProva.count({ where: { prova: { ti: true }, competencia: { not: null } } }),
    prisma.prova.groupBy({ by: ["banca"], where: { status: "ok" }, _count: true }),
    prisma.prova.findMany({ where: { status: "erro" }, orderBy: { createdAt: "desc" }, take: 8, select: { orgao: true, ano: true, cargoNome: true, erro: true } }),
    prisma.conteudoEdital.groupBy({ by: ["eventoChave"] }),
    prisma.eventoBanca.groupBy({ by: ["detalhado"], _count: true }),
  ]);
  const n = (s: string) => porStatus.find((x) => x.status === s)?._count ?? 0;
  const detalhados = eventos.find((e) => e.detalhado)?._count ?? 0;
  const totalEventos = eventos.reduce((s, e) => s + e._count, 0);
  return (
    <>
      <h1>Provas anteriores</h1>
      <div className="card">
        <div className="row">
          <span><strong>{n("ok")}</strong> prova(s) prontas</span>
          <span><strong>{questoes}</strong> questões ({tiQ} de TI, {tiQ ? Math.round((classificadas / tiQ) * 100) : 0}% por competência)</span>
          <span><strong>{n("pendente")}</strong> na fila</span>
          <span><strong>{n("erro")}</strong> com erro</span>
        </div>
        <p className="mut">
          Concursos do Cebraspe lidos: {detalhados}/{totalEventos} · editais de TI com conteúdo programático: {editais.length}
          {porBanca.length > 0 && ` · por banca: ${porBanca.map((b) => `${b.banca} (${b._count})`).join(", ")}`}
        </p>
        <p className="mut">
          Coleta automática: Cebraspe (acesso livre, respeitando o robots.txt), sem IA. Outras bancas bloqueiam robôs — importe o PDF manualmente.{" "}
          <Link href="/taxonomia">Ver competências e questões sem classificação</Link>
        </p>
      </div>
      <PainelProvas />
      {erros.length > 0 && (
        <div className="card">
          <h2>Últimos erros de leitura</h2>
          {erros.map((e, i) => <p key={i} className="mut">{e.orgao} {e.ano ?? ""} · {e.cargoNome}: {e.erro}</p>)}
        </div>
      )}
    </>
  );
}
