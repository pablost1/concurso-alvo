import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { removerAlvo, definirEdital } from "../actions";
import { PainelTemas } from "./painel-temas";
import { PainelProvasPci } from "./painel-provas-pci";
import { ProvasNoBanco } from "./provas-no-banco";
import { provasNoBancoDoAlvo } from "@/lib/provas/simulado";

export default async function MeusAlvos() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const alvos = await prisma.alvo.findMany({
    where: { userId }, orderBy: { createdAt: "desc" },
    include: { cargo: { include: { concurso: true, temas: true } } },
  });
  const prog = await prisma.progressoCargo.findMany({ where: { userId } });
  const porCargo = new Map(prog.map((p) => [p.cargoId, p]));
  const noBanco = new Map(await Promise.all(alvos.map(async (a) => [a.id, await provasNoBancoDoAlvo(userId, a.id)] as const)));

  return (
    <>
      <h1>Meus alvos</h1>
      {alvos.length === 0 && <div className="card">Você ainda não escolheu nenhum cargo. <Link href="/concursos">Ver concursos</Link></div>}
      {alvos.map((a) => {
        const p = porCargo.get(a.cargoId);
        const disciplinas = a.cargo.temas.map((t) => ({ disciplina: t.disciplina, topicos: JSON.parse(t.topicos) as string[] }));
        return (
          <div key={a.id} className="card">
            <div className="row">
              <strong style={{ flex: 1 }}>{a.cargo.nome} <span className="mut">· {a.cargo.concurso.orgao}</span></strong>
              <form action={removerAlvo.bind(null, a.id)}><button className="vermelho" type="submit">Remover</button></form>
            </div>
            {disciplinas.length > 0 && (
              <>
                <div className="row mut">
                  <span>Proficiência {p?.proficiencia ?? 0}%</span>
                  <span className="xp">{p?.xp ?? 0} XP</span>
                  <Link className="btn verde" href={`/estudar/${a.id}`}>Estudar</Link>
                  <Link className="btn azul" href={`/simulado/${a.id}`}>Simulado (provas anteriores)</Link>
                </div>
                <div className="bar" aria-label="Proficiência"><i style={{ width: `${p?.proficiencia ?? 0}%` }} /></div>
              </>
            )}
            <PainelTemas alvoId={a.id} inicial={disciplinas} temEdital={Boolean(a.cargo.concurso.editalUrl)} />
            {noBanco.get(a.id) && <ProvasNoBanco alvoId={a.id} dados={noBanco.get(a.id)!} />}
            <PainelProvasPci alvoId={a.id} />
            <details>
              <summary className="mut">Informar link do edital manualmente</summary>
              <form action={definirEdital.bind(null, a.cargo.concursoId)} className="row" style={{ marginTop: 8 }}>
                <input name="url" type="url" placeholder="https://…/edital.pdf" defaultValue={a.cargo.concurso.editalUrl ?? ""} style={{ flex: 1 }} />
                <button className="amarelo" type="submit">Salvar</button>
              </form>
            </details>
          </div>
        );
      })}
    </>
  );
}
