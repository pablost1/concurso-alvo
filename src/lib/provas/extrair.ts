import { extrairTextoPdf } from "../pdf";
import { melhorCompetencia, competenciaPorId, nomeGrupo } from "../taxonomia/ti";
import { dependeDeApoio } from "./parser/limpar";
import { parseProva } from "./parser/prova";

export type Gabarito = Map<number, string>; // número -> letra ("X" = anulada)

/**
 * Gabarito em tabela: uma linha de números seguida de uma linha de letras (C/E/A–E/X/*).
 * Formato dos gabaritos do Cebraspe; retorna vazio se o layout for outro.
 */
export function parseGabarito(texto: string): Gabarito {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim().split(/\s+/).filter(Boolean));
  const mapa: Gabarito = new Map();
  for (let i = 0; i < linhas.length - 1; i++) {
    // Gabaritos preenchem o resto da tabela com "0": remove o enchimento do fim das duas linhas.
    const tira0 = (t: string[]) => { const r = [...t]; while (r.length && r.at(-1) === "0") r.pop(); return r; };
    const nums = tira0(linhas[i]), letras = tira0(linhas[i + 1]);
    if (nums.length < 2 || nums.length !== letras.length) continue;
    if (!nums.every((t) => /^\d{1,3}$/.test(t))) continue;
    if (!letras.every((t) => /^[A-EXa-ex*]$/.test(t))) continue;
    nums.forEach((n, k) => mapa.set(parseInt(n, 10), letras[k] === "*" ? "X" : letras[k].toUpperCase()));
  }
  return mapa;
}

export type QuestaoExtraida = {
  numero: number;
  enunciado: string;
  alternativas: string[];
  disciplina: string;
  topico: string;
  tipo: "certo_errado" | "multipla";
  correta: number | null;
  anulada: boolean;
  competencia: string | null;
  dependeDeApoio: boolean;
  hash: string;
};

export function aplicarGabarito(
  q: { numero: number; alternativas: string[] },
  gab: Gabarito,
): { tipo: "certo_errado" | "multipla"; alternativas: string[]; correta: number | null; anulada: boolean } | null {
  const letra = gab.get(q.numero);
  if (!letra) return null;
  // "C" e "E" também são letras de múltipla escolha: o tipo vem do número de alternativas, não da letra.
  const ce = q.alternativas.length < 3;
  const alternativas = ce ? ["Certo", "Errado"] : q.alternativas;
  if (letra === "X") return { tipo: ce ? "certo_errado" : "multipla", alternativas, correta: null, anulada: true };
  const correta = ce ? (letra === "C" ? 0 : letra === "E" ? 1 : -1) : "ABCDE".indexOf(letra);
  if (correta < 0 || correta >= alternativas.length) return null;
  return { tipo: ce ? "certo_errado" : "multipla", alternativas, correta, anulada: false };
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Chave para eliminar a mesma questão cobrada em provas diferentes. */
export function hashQuestao(enunciado: string, alternativas: string[]): string {
  return `${norm(enunciado).slice(0, 220)}|${alternativas.length}`;
}

/** Lê prova + gabarito (PDFs já em memória) sem IA e devolve as questões prontas para gravar. */
export async function lerProva(opts: { provaPdf: Buffer; gabaritoPdf: Buffer }): Promise<QuestaoExtraida[]> {
  const textoProva = await extrairTextoPdf(opts.provaPdf);
  if (textoProva.trim().length < 500) throw new Error("PDF da prova sem texto (provavelmente escaneado; OCR não suportado)");
  const gab = parseGabarito(await extrairTextoPdf(opts.gabaritoPdf));
  if (gab.size === 0) throw new Error("Gabarito em formato não reconhecido");
  return montarQuestoes(textoProva, gab);
}

export function montarQuestoes(textoProva: string, gab: Gabarito): QuestaoExtraida[] {
  const r = parseProva(textoProva);
  if (r.layout === "desconhecido") throw new Error("Layout da prova não reconhecido (esperado 'Questão N' + A–E, ou itens certo/errado)");

  const lista: QuestaoExtraida[] = [];
  const vistos = new Set<number>();
  for (const q of r.questoes) {
    if (vistos.has(q.numero)) continue;
    const g = aplicarGabarito(q, gab);
    if (!g) continue;
    vistos.add(q.numero);
    const competencia = melhorCompetencia(q.enunciado, g.alternativas.join(" "));
    const no = competencia ? competenciaPorId(competencia) : undefined;
    lista.push({
      numero: q.numero,
      enunciado: q.enunciado,
      alternativas: g.alternativas,
      tipo: g.tipo,
      correta: g.correta,
      anulada: g.anulada,
      disciplina: competencia ? nomeGrupo(competencia) : "Não classificada",
      topico: no?.nome ?? "Não classificada",
      competencia,
      dependeDeApoio: dependeDeApoio(`${q.enunciado} ${q.alternativas.join(" ")}`),
      hash: hashQuestao(q.enunciado, g.alternativas),
    });
  }
  lista.sort((a, b) => a.numero - b.numero);

  // Validação: o gabarito pode cobrir mais itens que o PDF (provas divididas em partes), então
  // conferimos se as questões detectadas formam uma sequência sem buracos e se quase todas têm gabarito.
  const numeros = [...r.questoes.map((q) => q.numero), ...r.descartadas];
  if (numeros.length < 5) throw new Error(`Poucas questões detectadas (${numeros.length})`);
  const span = Math.max(...numeros) - Math.min(...numeros) + 1;
  if (lista.length < Math.ceil(span * 0.9)) {
    throw new Error(`Extração incompleta: ${lista.length} de ${span} questões (descartadas: ${r.descartadas.join(",") || "nenhuma"}; sem gabarito: ${r.questoes.length - lista.length})`);
  }
  return lista;
}
