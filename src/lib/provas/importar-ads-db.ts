import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../db";
import { salvarQuestoes } from "./sync";
import { agruparProvas, type RegistroAds } from "./importar-ads";

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
    await salvarQuestoes(prova.id, novas);
    r.importadas++;
    r.questoes += novas.length;
    r.comImagem += novas.filter((q) => q.dependeDeApoio).length;
  }
  return r;
}
