import { prisma } from "./db";
import { classificarArea } from "./areas";
import { coletarDetalhe, coletarListagem } from "./sources/pci";
import { verificarConcurso } from "./sources/verify";

const MAX_DETALHES_POR_RODADA = Number(process.env.SYNC_MAX_DETALHES ?? 80);

function extrairCurso(cargo: string): string | null {
  const m = cargo.match(/(?:especialidade|área|area|formação)\s*:\s*(.+)$/i) ?? cargo.match(/\s[-–]\s(.+)$/);
  return m ? m[1].trim() : null;
}

let rodando = false;

export async function sincronizar(): Promise<{ novos: number; atualizados: number }> {
  if (rodando) throw new Error("Sincronização já em andamento");
  rodando = true;
  const log = await prisma.syncLog.create({ data: { fonte: "pci" } });
  const erros: string[] = [];
  let novos = 0;
  let atualizados = 0;
  try {
    const itens = await coletarListagem();
    const urlsAtuais = new Set(itens.map((i) => i.url));
    let detalhes = 0;

    for (const item of itens) {
      try {
        const existente = await prisma.concurso.findUnique({ where: { fonteUrl: item.url }, include: { _count: { select: { cargos: true } } } });
        const precisaDetalhe = (!existente || !existente.verificadoEm) && detalhes < MAX_DETALHES_POR_RODADA;

        let cargos = item.cargos.map((nome) => ({ nome, vagas: null as number | null }));
        let banca: string | null = existente?.banca ?? null;
        let verificado = existente?.verificado ?? false;
        let fonteConfirmacaoUrl = existente?.fonteConfirmacaoUrl ?? null;
        let verificadoEm = existente?.verificadoEm ?? null;

        if (precisaDetalhe) {
          detalhes++;
          const d = await coletarDetalhe(item.url);
          if (d.cargos.length) cargos = d.cargos;
          banca = d.banca ?? banca;
          const v = await verificarConcurso(item.orgao, d.linksOficiais);
          verificado = v.verificado;
          fonteConfirmacaoUrl = v.url;
          verificadoEm = new Date();
        }
        if (!cargos.length && existente?._count.cargos) cargos = []; // mantém os já gravados
        if (!cargos.length && !existente?._count.cargos) cargos = [{ nome: "Vários cargos (ver edital)", vagas: item.vagas }];

        const dados = {
          orgao: item.orgao, titulo: item.titulo, uf: item.uf, status: "aberto",
          editalUrl: fonteConfirmacaoUrl ?? existente?.editalUrl ?? null,
          banca, inscricoesAte: item.inscricoesAte, verificado, verificadoEm, fonteConfirmacaoUrl,
        };
        const concurso = await prisma.concurso.upsert({
          where: { fonteUrl: item.url },
          create: { ...dados, fonteUrl: item.url },
          update: dados,
        });
        existente ? atualizados++ : novos++;

        for (const c of cargos) {
          const area = classificarArea(c.nome, extrairCurso(c.nome)) ?? "outras";
          await prisma.cargo.upsert({
            where: { concursoId_nome: { concursoId: concurso.id, nome: c.nome } },
            create: { concursoId: concurso.id, nome: c.nome, escolaridade: item.escolaridade, curso: extrairCurso(c.nome), area, vagas: c.vagas, salario: item.salario },
            update: { escolaridade: item.escolaridade, curso: extrairCurso(c.nome), area, vagas: c.vagas ?? undefined, salario: item.salario },
          });
        }
      } catch (e) {
        erros.push(`${item.url}: ${(e as Error).message}`);
      }
    }

    // Concursos que saíram da listagem são marcados como encerrados.
    await prisma.concurso.updateMany({ where: { status: "aberto", fonteUrl: { notIn: [...urlsAtuais] } }, data: { status: "encerrado" } });
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: erros.length ? "parcial" : "ok", fimEm: new Date(), novos, erros: erros.slice(0, 20).join("\n") || null } });
    return { novos, atualizados };
  } catch (e) {
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: "erro", fimEm: new Date(), erros: (e as Error).message } });
    throw e;
  } finally {
    rodando = false;
  }
}
