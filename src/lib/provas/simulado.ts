import { prisma } from "../db";
import { cargoCompativel, orgaoCasa } from "./casar";
import { competenciaPorId } from "../taxonomia/ti";
import { perfilDoCargo, selecionar, type Cobertura, type ItemPerfil } from "../prova-cargo";

/**
 * cargo    = prova ideal do cargo (todas as provas do banco, seguindo o perfil de competências do edital)
 * concurso = só provas anteriores do mesmo órgão (e cargo/área compatível)
 * cruzado  = só provas de outros órgãos, nas mesmas competências
 */
export type ModoSimulado = "cargo" | "concurso" | "cruzado";

export type QuestaoSimulado = {
  id: string;
  numero: number;
  enunciado: string;
  alternativas: string[];
  origem: string; // ex.: "ABIN 2018 · cebraspe"
  competencia: { id: string; nome: string } | null;
  textoApoio?: string;
  imagens: string[]; // URLs servidas por /api/provas/imagens
};

const urlsDasImagens = (json: string | null) =>
  (json ? (JSON.parse(json) as string[]) : []).map((i) => `/api/provas/imagens/${i.split("/").map(encodeURIComponent).join("/")}`);

async function contexto(userId: string, alvoId: string) {
  const alvo = await prisma.alvo.findFirst({
    where: { id: alvoId, userId },
    include: { cargo: { include: { concurso: true } } },
  });
  if (!alvo) return null;
  const perfil = await perfilDoCargo(alvo.cargoId);
  const textoConcurso = `${alvo.cargo.concurso.orgao} ${alvo.cargo.concurso.titulo}`;
  return { alvo, cargo: alvo.cargo, perfil, textoConcurso };
}

/** Questões elegíveis: prova pronta, com gabarito válido, autocontidas, ainda não respondidas pelo usuário. */
async function candidatas(userId: string, comps: string[]) {
  return prisma.questaoProva.findMany({
    where: {
      competencia: { in: comps },
      anulada: false,
      correta: { not: null },
      dependeDeApoio: false,
      prova: { status: "ok" },
      respostas: { none: { userId } },
    },
    select: {
      id: true, numero: true, enunciado: true, alternativas: true, competencia: true, hash: true, textoApoio: true, imagens: true,
      prova: { select: { id: true, orgao: true, orgaoChave: true, ano: true, banca: true, area: true, cargoNome: true } },
    },
  });
}

type Linha = Awaited<ReturnType<typeof candidatas>>[number];

function filtrar(linhas: Linha[], modo: ModoSimulado, ctx: NonNullable<Awaited<ReturnType<typeof contexto>>>) {
  const mesmo = (l: Linha) => orgaoCasa(ctx.textoConcurso, l.prova.orgaoChave);
  if (modo === "concurso") return linhas.filter((l) => mesmo(l) && cargoCompativel(l.prova, ctx.cargo));
  if (modo === "cruzado") return linhas.filter((l) => !mesmo(l));
  return linhas;
}

const paraCandidata = (ctx: NonNullable<Awaited<ReturnType<typeof contexto>>>) => (l: Linha) => ({
  ...l,
  competencia: l.competencia!,
  banca: l.prova.banca,
  ano: l.prova.ano,
  mesmoOrgao: orgaoCasa(ctx.textoConcurso, l.prova.orgaoChave),
});

export async function contarDisponiveis(userId: string, alvoId: string) {
  const ctx = await contexto(userId, alvoId);
  if (!ctx) return null;
  const linhas = await candidatas(userId, ctx.perfil.itens.map((i) => i.competencia));
  const conta = (modo: ModoSimulado) => filtrar(linhas, modo, ctx).length;
  return { cargo: conta("cargo"), concurso: conta("concurso"), cruzado: conta("cruzado"), fonte: ctx.perfil.fonte, competencias: ctx.perfil.itens.length };
}

export async function montarSimulado(userId: string, alvoId: string, modo: ModoSimulado, n: number) {
  const ctx = await contexto(userId, alvoId);
  if (!ctx) return null;
  const linhas = filtrar(await candidatas(userId, ctx.perfil.itens.map((i) => i.competencia)), modo, ctx);
  const { escolhidas, cobertura } = selecionar(linhas.map(paraCandidata(ctx)), ctx.perfil.itens, n, ctx.cargo.concurso.banca);
  // Embaralha a ordem final (a seleção já respeitou as cotas por competência).
  escolhidas.sort(() => Math.random() - 0.5);
  const questoes: QuestaoSimulado[] = escolhidas.map((l) => {
    const no = competenciaPorId(l.competencia);
    return {
      id: l.id, numero: l.numero, enunciado: l.enunciado, alternativas: JSON.parse(l.alternativas) as string[],
      origem: `${l.prova.orgao}${l.prova.ano ? ` ${l.prova.ano}` : ""} · ${l.prova.banca}`,
      competencia: no ? { id: no.id, nome: no.nome } : null,
      textoApoio: l.textoApoio ?? undefined, imagens: urlsDasImagens(l.imagens),
    };
  });
  return { questoes, cobertura: cobertura as Cobertura[], fonte: ctx.perfil.fonte };
}

/** Prática focada: questões inéditas de uma competência (ou da mais fraca do perfil). */
export async function montarPratica(userId: string, alvoId: string, competencia: string | null, n = 5) {
  const ctx = await contexto(userId, alvoId);
  if (!ctx) return null;
  let alvoComp = competencia;
  if (!alvoComp) {
    const prog = await prisma.progressoTopico.findMany({ where: { userId, cargoId: ctx.cargo.id, disciplina: "comp" } });
    const dom = new Map(prog.map((p) => [p.topico, p.dominio]));
    // maior "necessidade" = peso do edital × quanto falta dominar
    alvoComp = [...ctx.perfil.itens].sort((a, b) => b.peso * (1 - (dom.get(b.competencia) ?? 0)) - a.peso * (1 - (dom.get(a.competencia) ?? 0)))[0]?.competencia ?? null;
  }
  if (!alvoComp) return { questoes: [] as QuestaoSimulado[], competencia: null };
  const linhas = await candidatas(userId, [alvoComp]);
  const { escolhidas } = selecionar(linhas.map(paraCandidata(ctx)), [{ competencia: alvoComp, nome: "", grupo: "", peso: 1 } as ItemPerfil], n, ctx.cargo.concurso.banca);
  const no = competenciaPorId(alvoComp);
  return {
    competencia: no ? { id: no.id, nome: no.nome } : null,
    questoes: escolhidas.map((l) => ({
      id: l.id, numero: l.numero, enunciado: l.enunciado, alternativas: JSON.parse(l.alternativas) as string[],
      origem: `${l.prova.orgao}${l.prova.ano ? ` ${l.prova.ano}` : ""} · ${l.prova.banca}`,
      competencia: no ? { id: no.id, nome: no.nome } : null,
      textoApoio: l.textoApoio ?? undefined, imagens: urlsDasImagens(l.imagens),
    })) as QuestaoSimulado[],
  };
}

export type ProvaDoBanco = { id: string; orgao: string; banca: string; ano: number | null; cargoNome: string; questoes: number; origem: string };

/** Provas já no banco ligadas ao concurso do alvo: mesmo órgão (mais recentes antes) e, depois, outras da mesma banca. */
export async function provasNoBancoDoAlvo(userId: string, alvoId: string) {
  const alvo = await prisma.alvo.findFirst({ where: { id: alvoId, userId }, include: { cargo: { include: { concurso: true } } } });
  if (!alvo) return null;
  const { concurso, ...cargo } = alvo.cargo;
  const texto = `${concurso.orgao} ${concurso.titulo}`;
  const provas = await prisma.prova.findMany({ where: { status: "ok", totalQuestoes: { gt: 0 } } });
  const compativeis = provas.filter((p) => cargoCompativel(p, { area: cargo.area, nome: cargo.nome }));
  const paraItem = (p: (typeof provas)[number]): ProvaDoBanco => ({
    id: p.id, orgao: p.orgao, banca: p.banca, ano: p.ano, cargoNome: p.cargoNome, questoes: p.totalQuestoes, origem: p.origem,
  });
  const recentes = (a: { ano: number | null }, b: { ano: number | null }) => (b.ano ?? 0) - (a.ano ?? 0);
  const mesmoOrgao = compativeis.filter((p) => orgaoCasa(texto, p.orgaoChave)).sort(recentes);
  const banca = concurso.banca ?? mesmoOrgao[0]?.banca ?? null;
  const ids = new Set(mesmoOrgao.map((p) => p.id));
  const mesmaBanca = banca
    ? compativeis.filter((p) => !ids.has(p.id) && p.banca.toLowerCase() === banca.toLowerCase()).sort(recentes).slice(0, 10)
    : [];
  return { banca, mesmoOrgao: mesmoOrgao.map(paraItem), mesmaBanca: mesmaBanca.map(paraItem) };
}
