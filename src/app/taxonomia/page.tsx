import { prisma } from "@/lib/db";
import { COMPETENCIAS, GRUPOS } from "@/lib/taxonomia/ti";

export default async function Taxonomia() {
  const grupos = await prisma.questaoProva.groupBy({ by: ["competencia"], where: { prova: { ti: true } }, _count: true });
  const cont = new Map(grupos.map((g) => [g.competencia, g._count]));
  const semClass = cont.get(null) ?? 0;
  const amostra = await prisma.questaoProva.findMany({
    where: { competencia: null, prova: { ti: true } }, take: 15, orderBy: { id: "asc" },
    select: { enunciado: true, prova: { select: { orgao: true, ano: true } } },
  });
  return (
    <>
      <h1>Competências de TI</h1>
      <p className="mut">Classificação por dicionário de termos (sem IA). Acrescente termos em <code>src/lib/taxonomia/ti.ts</code> e rode <code>npm run taxonomia:sugerir</code> para ver o que falta.</p>
      {Object.entries(GRUPOS).filter(([g]) => g !== "geral").map(([g, nome]) => {
        const nos = COMPETENCIAS.filter((c) => c.grupo === g);
        const total = nos.reduce((s, c) => s + (cont.get(c.id) ?? 0), 0);
        return (
          <div key={g} className="card">
            <div className="row"><strong style={{ flex: 1 }}>{nome}</strong><span className="mut">{total} questões</span></div>
            {nos.map((c) => (
              <div key={c.id} className="row mut"><span style={{ flex: 1 }}>{c.nome}</span><span>{cont.get(c.id) ?? 0}</span></div>
            ))}
          </div>
        );
      })}
      <div className="card">
        <h2>Sem classificação ({semClass})</h2>
        {amostra.map((q, i) => <p key={i} className="mut">{q.prova.orgao} {q.prova.ano ?? ""}: {q.enunciado.slice(0, 160)}…</p>)}
        {amostra.length === 0 && <p className="mut">Nenhuma — todas as questões de TI foram classificadas.</p>}
      </div>
    </>
  );
}
