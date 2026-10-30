import { competenciaPorId, melhorCompetencia, nomeGrupo } from "../taxonomia/ti";
import { chaveOrgao, areaDoCargo, eCargoTI } from "./casar";
import { hashQuestao, type QuestaoExtraida } from "./extrair";
import { dependeDeApoio } from "./parser/limpar";

/** Uma linha de `provas-ads/out/questoes.jsonl`. */
export type RegistroAds = {
  id: string;
  prova_id: string;
  banca: string;
  ano: number | null;
  orgao: string;
  cargo: string;
  numero: number;
  enunciado: string;
  alternativas: Record<string, string>;
  gabarito: string | null;
  anulada?: boolean;
  imagens?: string[];
};

export type ProvaAds = {
  provaId: string;
  orgao: string;
  orgaoChave: string;
  banca: string;
  ano: number | null;
  cargoNome: string;
  area: string | null;
  ti: boolean;
  questoes: QuestaoExtraida[];
  semGabarito: number;
};

const LETRAS = ["A", "B", "C", "D", "E"];

/** Converte um registro; devolve null quando não há gabarito utilizável. */
export function converterRegistro(r: RegistroAds): QuestaoExtraida | null {
  const alternativas = LETRAS.map((l) => r.alternativas?.[l]).filter((a): a is string => Boolean(a?.trim()));
  if (alternativas.length < 4 || !r.enunciado?.trim()) return null;
  const idx = r.gabarito ? LETRAS.indexOf(r.gabarito.trim().toUpperCase()) : -1;
  const anulada = Boolean(r.anulada);
  if (idx < 0 && !anulada) return null;
  const competencia = melhorCompetencia(r.enunciado, alternativas.join(" "));
  const no = competencia ? competenciaPorId(competencia) : undefined;
  return {
    numero: r.numero,
    enunciado: r.enunciado.trim(),
    alternativas,
    tipo: "multipla",
    correta: idx >= 0 && idx < alternativas.length ? idx : null,
    anulada,
    disciplina: competencia ? nomeGrupo(competencia) : "Não classificada",
    topico: no?.nome ?? "Não classificada",
    competencia,
    // Imagens do PDF não são guardadas: a questão fica fora dos simulados.
    dependeDeApoio: Boolean(r.imagens?.length) || dependeDeApoio(r.enunciado),
    hash: hashQuestao(r.enunciado, alternativas),
  };
}

export function agruparProvas(registros: RegistroAds[]): ProvaAds[] {
  const porProva = new Map<string, RegistroAds[]>();
  for (const r of registros) porProva.set(r.prova_id, [...(porProva.get(r.prova_id) ?? []), r]);
  return [...porProva.entries()].map(([provaId, rs]) => {
    const primeiro = rs[0];
    const questoes: QuestaoExtraida[] = [];
    let semGabarito = 0;
    for (const r of rs) {
      const q = converterRegistro(r);
      if (q) questoes.push(q);
      else semGabarito++;
    }
    return {
      provaId,
      orgao: primeiro.orgao,
      orgaoChave: chaveOrgao(primeiro.orgao),
      banca: primeiro.banca.toLowerCase(),
      ano: primeiro.ano ?? null,
      cargoNome: primeiro.cargo,
      area: areaDoCargo(primeiro.cargo),
      ti: eCargoTI(primeiro.cargo),
      questoes,
      semGabarito,
    };
  });
}
