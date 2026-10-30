import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { nomeArea } from "@/lib/areas";
import { adicionarAlvo } from "../../actions";

export default async function ConcursoPage(props: PageProps<"/concursos/[id]">) {
  const { id } = await props.params;
  const userId = await getUserId();
  const c = await prisma.concurso.findUnique({ where: { id }, include: { cargos: { orderBy: { nome: "asc" } } } });
  if (!c) notFound();
  const meus = new Set(
    userId ? (await prisma.alvo.findMany({ where: { userId, cargoId: { in: c.cargos.map((x) => x.id) } } })).map((a) => a.cargoId) : [],
  );
  return (
    <>
      <h1>{c.orgao}</h1>
      <p className="mut">{c.titulo}</p>
      <div className="row">
        {c.verificado
          ? <span className="badge ok">✔ Confirmado na fonte oficial</span>
          : <span className="badge warn">Não confirmado em fonte oficial</span>}
        {c.banca && <span className="badge">Banca: {c.banca}</span>}
        <a href={c.fonteUrl} target="_blank" rel="noreferrer">Notícia (PCI)</a>
        {c.fonteConfirmacaoUrl && <a href={c.fonteConfirmacaoUrl} target="_blank" rel="noreferrer">Fonte oficial</a>}
      </div>
      <h2>Cargos</h2>
      {c.cargos.map((cg) => (
        <div key={cg.id} className="card row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <strong>{cg.nome}</strong>
            <div className="mut">{nomeArea(cg.area)}{cg.escolaridade ? ` · ${cg.escolaridade}` : ""}{cg.curso ? ` · ${cg.curso}` : ""}{cg.vagas ? ` · ${cg.vagas} vaga(s)` : ""}{cg.salario ? ` · até ${cg.salario}` : ""}</div>
          </div>
          {meus.has(cg.id)
            ? <span className="badge ok">Já é seu alvo</span>
            : <form action={adicionarAlvo.bind(null, cg.id)}><button className="verde" type="submit">🎯 Adicionar como alvo</button></form>}
        </div>
      ))}
    </>
  );
}
