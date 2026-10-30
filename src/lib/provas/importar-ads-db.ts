import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../db";
import type { QuestaoExtraida } from "./extrair";
import { agruparProvas, type RegistroAds } from "./importar-ads";

/** Atualiza as questões no lugar (sem apagar), para preservar o histórico de respostas dos usuários. */
async function gravarQuestoes(provaId: string, questoes: QuestaoExtraida[]) {
  for (const q of questoes) {
    const d = {
      disciplina: q.disciplina, topico: q.topico, enunciado: q.enunciado, alternativas: JSON.stringify(q.alternativas),
      correta: q.correta, tipo: q.tipo, anulada: q.anulada, competencia: q.competencia, dependeDeApoio: q.dependeDeApoio,
      hash: q.hash, textoApoio: q.textoApoio ?? null, imagens: q.imagens?.length ? JSON.stringify(q.imagens) : null,
    };
    await prisma.questaoProva.upsert({ where: { provaId_numero: { provaId, numero: q.numero } }, create: { provaId, numero: q.numero, ...d }, update: d });
  }
  await prisma.questaoProva.deleteMany({ where: { provaId, numero: { notIn: questoes.map((q) => q.numero) } } });
  await prisma.prova.update({ where: { id: provaId }, data: { status: "ok", erro: null, totalQuestoes: questoes.length } });
}

export const CAMINHO_ADS = () => resolve(process.env.PROVAS_ADS_DIR ?? "../provas-ads/out", "questoes.jsonl");

export type ResumoImportacao = { lidas: number; importadas: number; vazias: number; questoes: number; semGabarito: number; duplicadas: number; comImagem: number };

/** Lê o questoes.jsonl do provas-ads (somente leitura) e grava em Prova/QuestaoProva. Idempotente. */
export async function importarProvasAds(arquivo = CAMINHO_ADS()): Promise<ResumoImportacao> {
  const registros = readFileSync(arquivo, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as RegistroAds);
  const provas = agruparProvas(registros);
  const r: ResumoImportacao = { lidas: provas.length, importadas: 0, vazias: 0, questoes: 0, semGabarito: 0, duplicadas: 0, comImagem: 0 };
  for (const p of provas) {
    r.semGabarito += p.semGabarito;
    if (!p.questoes.length) { r.vazias++; continue; }
    const provaUrl = `provas-ads:${p.provaId}`;
    // Questões já presentes em outra prova (mesmo hash) não entram de novo.
    const existentes = new Set(
      (await prisma.questaoProva.findMany({ where: { prova: { provaUrl: { not: provaUrl } } }, select: { hash: true } })).map((q) => q.hash),
    );
    const novas = p.questoes.filter((q) => !existentes.has(q.hash));
    r.duplicadas += p.questoes.length - novas.length;
    if (!novas.length) { r.vazias++; continue; }
    const dados = {
      orgao: p.orgao, orgaoChave: p.orgaoChave, banca: p.banca, ano: p.ano, cargoNome: p.cargoNome,
      area: p.area, ti: p.ti, origem: "importada",
    };
    const prova = await prisma.prova.upsert({ where: { provaUrl }, create: { ...dados, provaUrl, status: "processando" }, update: dados });
    await gravarQuestoes(prova.id, novas);
    r.importadas++;
    r.questoes += novas.length;
    r.comImagem += novas.filter((q) => q.dependeDeApoio).length;
  }
  return r;
}
