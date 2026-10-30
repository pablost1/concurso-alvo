import { prisma } from "../db";
import { baixarPdf, extrairTextoPdf } from "../pdf";
import { detalharEvento, editalDeAbertura, eventoTemTI, extrairProvas, listarEventosEncerrados, urlArquivo } from "./cebraspe";
import { areaDoCargo, chaveOrgao, eCargoTI, orgaoCasa } from "./casar";
import { lerProva, type QuestaoExtraida } from "./extrair";
import { parseConteudoEdital } from "./parser/edital";

const SO_TI = () => (process.env.PROVAS_SO_TI ?? "1") !== "0";
const ANOS_RECENTES = () => Number(process.env.PROVAS_ANOS ?? 40);

export type OpcoesSync = { maxDetalhes?: number; maxProvas?: number; log?: (msg: string) => void };

let rodando = false;

/** Atualiza a lista de eventos do Cebraspe e marca os que coincidem com algum concurso aberto. */
async function atualizarEventos() {
  const eventos = (await listarEventosEncerrados()).filter((x) => !/^TESTE/i.test(x.nome));
  for (const e of eventos) {
    await prisma.eventoBanca.upsert({
      where: { banca_chave: { banca: "cebraspe", chave: e.chave } },
      create: { banca: "cebraspe", chave: e.chave, nome: e.nome, ano: e.ano, orgaoChave: e.orgaoChave },
      update: { nome: e.nome, ano: e.ano, orgaoChave: e.orgaoChave },
    });
  }
  const abertos = await prisma.concurso.findMany({ where: { status: "aberto" }, select: { orgao: true, titulo: true } });
  const textos = abertos.map((c) => `${c.orgao} ${c.titulo}`);
  const todos = await prisma.eventoBanca.findMany({ where: { banca: "cebraspe" } });
  for (const ev of todos) {
    const casado = textos.some((t) => orgaoCasa(t, ev.orgaoChave));
    if (casado !== ev.casado) await prisma.eventoBanca.update({ where: { id: ev.id }, data: { casado } });
  }
}

/** Recalcula a marca "TI" das provas já cadastradas (a regra pode ter evoluído desde a coleta). */
async function remarcarTI() {
  const provas = await prisma.prova.findMany({ select: { id: true, cargoNome: true, ti: true, evento: { select: { temTI: true } } } });
  for (const p of provas) {
    const geral = /conhecimentos (gerais|basicos|básicos)/i.test(p.cargoNome);
    const ti = eCargoTI(p.cargoNome) || (geral && Boolean(p.evento?.temTI));
    if (ti !== p.ti) await prisma.prova.update({ where: { id: p.id }, data: { ti } });
  }
}

/** Guarda o conteúdo programático dos cargos de TI do edital de abertura (base do perfil de competências). */
async function gravarConteudoEdital(ev: { chave: string; nome: string; ano: number | null }, nomeArquivo: string) {
  const texto = await extrairTextoPdf(await baixarPdf(urlArquivo(ev.chave, nomeArquivo)));
  const conteudo = parseConteudoEdital(texto);
  const linhas: { cargoNome: string; disciplina: string; itens: string[] }[] = [];
  for (const c of conteudo.cargos.filter((x) => eCargoTI(x.nome))) {
    for (const d of [...conteudo.gerais, ...c.disciplinas]) linhas.push({ cargoNome: c.nome, disciplina: d.nome, itens: d.itens });
  }
  if (!linhas.length) return 0;
  await prisma.$transaction([
    prisma.conteudoEdital.deleteMany({ where: { banca: "cebraspe", eventoChave: ev.chave } }),
    prisma.conteudoEdital.createMany({
      data: linhas.map((l) => ({
        banca: "cebraspe", eventoChave: ev.chave, orgao: ev.nome, ano: ev.ano,
        cargoNome: l.cargoNome, disciplina: l.disciplina, itens: JSON.stringify(l.itens),
      })),
    }),
  ]);
  return linhas.length;
}

/** Lê os arquivos (provas, gabaritos, edital de abertura) dos próximos eventos: casados primeiro, depois os mais recentes. */
async function detalharEventos(erros: string[], max: number, log: (m: string) => void) {
  const minAno = new Date().getFullYear() - ANOS_RECENTES();
  const pendentes = await prisma.eventoBanca.findMany({
    where: { banca: "cebraspe", detalhado: false, OR: [{ casado: true }, { ano: null }, { ano: { gte: minAno } }] },
    orderBy: [{ casado: "desc" }, { ano: "desc" }],
    take: max,
  });
  let n = 0;
  for (const ev of pendentes) {
    n++;
    try {
      const d = await detalharEvento(ev.chave);
      const temTI = eventoTemTI(d);
      for (const p of extrairProvas(ev.chave, d)) {
        if (SO_TI() && !p.ti) continue;
        await prisma.prova.upsert({
          where: { provaUrl: p.provaUrl },
          create: {
            eventoId: ev.id, orgao: ev.nome, orgaoChave: ev.orgaoChave, banca: "cebraspe", ano: ev.ano,
            cargoNome: p.cargoNome, area: p.area, ti: p.ti, provaUrl: p.provaUrl, gabaritoUrl: p.gabaritoUrl,
            status: p.gabaritoUrl ? "pendente" : "erro", erro: p.gabaritoUrl ? null : "Gabarito não encontrado",
          },
          update: {
            gabaritoUrl: p.gabaritoUrl, ti: p.ti,
            // Gabarito que não existia e agora apareceu: volta para a fila.
            ...(p.gabaritoUrl ? { status: "pendente", erro: null } : {}),
          },
        });
      }
      let conteudoLido = ev.conteudoLido;
      const arquivoEdital = editalDeAbertura(d);
      if (temTI && arquivoEdital && !ev.conteudoLido) {
        try {
          await gravarConteudoEdital(ev, arquivoEdital);
          conteudoLido = true;
        } catch (e) {
          erros.push(`edital ${ev.chave}: ${(e as Error).message}`);
        }
      }
      await prisma.eventoBanca.update({ where: { id: ev.id }, data: { detalhado: true, temTI, editalArquivo: arquivoEdital, conteudoLido } });
      if (n % 25 === 0) log(`eventos detalhados: ${n}/${pendentes.length}`);
    } catch (e) {
      const msg = (e as Error).message;
      // Evento sem página/arquivos na API (404/500 persistente): não vale tentar de novo a cada rodada.
      if (/HTTP (404|500)/.test(msg)) await prisma.eventoBanca.update({ where: { id: ev.id }, data: { detalhado: true } });
      else erros.push(`${ev.chave}: ${msg}`);
    }
  }
}

export async function salvarQuestoes(provaId: string, questoes: QuestaoExtraida[]) {
  await prisma.$transaction([
    prisma.questaoProva.deleteMany({ where: { provaId } }),
    prisma.questaoProva.createMany({
      data: questoes.map((q) => ({
        provaId, numero: q.numero, disciplina: q.disciplina, topico: q.topico, enunciado: q.enunciado,
        alternativas: JSON.stringify(q.alternativas), correta: q.correta, tipo: q.tipo, anulada: q.anulada,
        competencia: q.competencia, dependeDeApoio: q.dependeDeApoio, hash: q.hash,
        textoApoio: q.textoApoio ?? null, imagens: q.imagens?.length ? JSON.stringify(q.imagens) : null,
      })),
    }),
    prisma.prova.update({ where: { id: provaId }, data: { status: "ok", erro: null, totalQuestoes: questoes.length } }),
  ]);
}

export async function processarProva(provaId: string): Promise<number> {
  const prova = await prisma.prova.findUniqueOrThrow({ where: { id: provaId } });
  await prisma.prova.update({ where: { id: provaId }, data: { status: "processando", erro: null } });
  try {
    if (!prova.gabaritoUrl) throw new Error("Gabarito não disponível");
    const provaPdf = await baixarPdf(prova.provaUrl);
    const gabaritoPdf = await baixarPdf(prova.gabaritoUrl);
    const questoes = await lerProva({ provaPdf, gabaritoPdf });
    await salvarQuestoes(provaId, questoes);
    return questoes.length;
  } catch (e) {
    const msg = (e as Error).message;
    // Falhas de rede voltam para a fila; layout/gabarito ilegível é erro definitivo (reprocessável quando o parser evoluir).
    const transitoria = /fetch failed|timeout|aborted|HTTP 5\d\d|ECONNRESET/i.test(msg);
    await prisma.prova.update({ where: { id: provaId }, data: { status: transitoria ? "pendente" : "erro", erro: msg.slice(0, 500) } });
    throw e;
  }
}

export async function criarProvaManual(d: { orgao: string; banca: string; ano: number | null; cargoNome: string }) {
  return prisma.prova.create({
    data: {
      orgao: d.orgao, orgaoChave: chaveOrgao(d.orgao), banca: d.banca.toLowerCase(), ano: d.ano,
      cargoNome: d.cargoNome, area: areaDoCargo(d.cargoNome), ti: eCargoTI(d.cargoNome),
      provaUrl: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, origem: "manual", status: "processando",
    },
  });
}

/** Provas que falharam por parser/gabarito voltam para a fila (útil depois de melhorar o parser). */
export async function reenfileirarErros() {
  const r = await prisma.prova.updateMany({
    where: { status: "erro", origem: "banca", gabaritoUrl: { not: null } },
    data: { status: "pendente", erro: null },
  });
  return r.count;
}

export async function sincronizarProvas(opts: OpcoesSync = {}) {
  if (rodando) throw new Error("Coleta de provas já em andamento");
  rodando = true;
  const log = opts.log ?? (() => {});
  const erros: string[] = [];
  let processadas = 0, falhas = 0;
  try {
    await prisma.prova.updateMany({ where: { status: "processando", origem: "banca" }, data: { status: "pendente" } });
    log("atualizando lista de concursos do Cebraspe…");
    await atualizarEventos();
    await detalharEventos(erros, opts.maxDetalhes ?? 60, log);
    await remarcarTI();

    const pendentes = await prisma.prova.findMany({
      where: { status: "pendente", origem: "banca", ...(SO_TI() ? { ti: true } : {}) },
      include: { evento: true },
    });
    pendentes.sort((a, b) => Number(b.evento?.casado ?? false) - Number(a.evento?.casado ?? false) || (b.ano ?? 0) - (a.ano ?? 0));

    const lote = pendentes.slice(0, opts.maxProvas ?? 40);
    for (const [i, p] of lote.entries()) {
      try {
        const n = await processarProva(p.id);
        processadas++;
        log(`[${i + 1}/${lote.length}] ${p.orgao} ${p.ano ?? ""} · ${p.cargoNome.slice(0, 50)}: ${n} questões`);
      } catch (e) {
        falhas++;
        erros.push(`${p.orgao} ${p.ano ?? ""} ${p.cargoNome.slice(0, 40)}: ${(e as Error).message}`);
      }
    }
    const restantes = await prisma.prova.count({ where: { status: "pendente", ...(SO_TI() ? { ti: true } : {}) } });
    return { processadas, falhas, restantes, erros: erros.slice(0, 30) };
  } finally {
    rodando = false;
  }
}
