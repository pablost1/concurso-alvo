import { limparTexto } from "./limpar";

export type QuestaoBruta = {
  numero: number;
  enunciado: string;
  alternativas: string[]; // vazio = item certo/errado
};

export type ResultadoParse = {
  layout: "multipla" | "certo_errado" | "desconhecido";
  questoes: QuestaoBruta[];
  descartadas: number[]; // números detectados mas sem estrutura válida
};

const compactar = (s: string) => s.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, " ").trim();

// "Questão 21", "QUESTÃO 31 <código>" e variações de caixa.
const CABECALHO_QUESTAO = /^Quest[ãaÃA]o\s+(\d{1,3})\b[^\n]*$/im;
const CABECALHO_QUESTAO_G = /^Quest[ãaÃA]o\s+\d{1,3}\b[^\n]*$/gim;

/** Múltipla escolha: blocos "Questão N" seguidos de alternativas A–E (ou A–D). */
function parseMultipla(texto: string): ResultadoParse {
  const partes = texto.split(CABECALHO_QUESTAO);
  const questoes: QuestaoBruta[] = [];
  const descartadas: number[] = [];
  for (let i = 1; i < partes.length; i += 2) {
    const numero = parseInt(partes[i], 10);
    const linhas = partes[i + 1].split("\n").map((l) => l.replace(/\t/g, " ").trimEnd());
    // As alternativas são procuradas de trás para frente: "A licitação..." no enunciado não pode virar alternativa A.
    const inicio = (letras: string[]) => {
      const idx: number[] = [];
      let limite = linhas.length;
      for (let k = letras.length - 1; k >= 0; k--) {
        let achou = -1;
        for (let j = limite - 1; j >= 0; j--) {
          if (new RegExp(`^${letras[k]}\\s+\\S`).test(linhas[j].trim()) || linhas[j].trim() === letras[k]) { achou = j; break; }
        }
        if (achou < 0) return null;
        idx[k] = achou;
        limite = achou;
      }
      return idx;
    };
    const idx = inicio(["A", "B", "C", "D", "E"]) ?? inicio(["A", "B", "C", "D"]);
    if (!idx) { descartadas.push(numero); continue; }
    const enunciado = compactar(linhas.slice(0, idx[0]).join("\n"));
    const alternativas = idx.map((ini, k) => {
      const fim = k + 1 < idx.length ? idx[k + 1] : linhas.length;
      return compactar(linhas.slice(ini, fim).join("\n").replace(/^\s*[A-E]\s+/, ""));
    });
    if (enunciado.length < 5 || alternativas.some((a) => !a)) { descartadas.push(numero); continue; }
    questoes.push({ numero, enunciado, alternativas });
  }
  return { layout: "multipla", questoes, descartadas };
}

/**
 * Linhas que começam um item numerado ("61<tab>texto" ou "41 texto"). Para não confundir com números soltos no meio
 * do texto, usa-se a maior cadeia de numeração consecutiva (n, n+1, n+2, …) encontrada no documento.
 */
function iniciosDeItens(linhas: string[]): { i: number; numero: number }[] {
  const cand: { i: number; numero: number }[] = [];
  linhas.forEach((l, i) => {
    const m = l.match(/^(\d{1,3})\s+(?=[A-Za-zÀ-ú"“(])/);
    if (m) cand.push({ i, numero: parseInt(m[1], 10) });
  });
  const cadeia: number[] = new Array(cand.length).fill(1);
  const prev: number[] = new Array(cand.length).fill(-1);
  const ultimoPorNumero = new Map<number, number>();
  cand.forEach((c, j) => {
    const k = ultimoPorNumero.get(c.numero - 1);
    if (k !== undefined) { cadeia[j] = cadeia[k] + 1; prev[j] = k; }
    ultimoPorNumero.set(c.numero, j);
  });
  let fim = -1;
  cadeia.forEach((len, j) => { if (fim < 0 || len > cadeia[fim]) fim = j; });
  if (fim < 0 || cadeia[fim] < 5) return [];
  const seq: number[] = [];
  for (let j = fim; j >= 0; j = prev[j]) seq.unshift(j);
  return seq.map((j) => ({ i: cand[j].i, numero: cand[j].numero }));
}

/** Itens certo/errado, com frases introdutórias ("... julgue os itens que se seguem."). */
function parseCertoErrado(texto: string): ResultadoParse {
  const linhas = texto.split("\n");
  const inicios = iniciosDeItens(linhas);
  const questoes: QuestaoBruta[] = [];
  let intro = "";
  inicios.forEach((ini, n) => {
    const fim = n + 1 < inicios.length ? inicios[n + 1].i : linhas.length;
    const seg = linhas.slice(ini.i, fim).map((l, k) => (k === 0 ? l.replace(/^\d{1,3}\s+/, "") : l));
    // Dentro do segmento, a introdução do próximo bloco começa em uma frase que termina em "julgue ...".
    let corte = seg.length;
    for (let k = 1; k < seg.length; k++) {
      const antes = seg[k - 1].trim();
      if (/[.;?:]$/.test(antes) && /^[A-ZÀ-Ú]/.test(seg[k].trim()) && /julgue|itens? (a seguir|seguintes?|subsequentes|que se seguem)/i.test(seg.slice(k).join(" "))) { corte = k; break; }
    }
    const item = compactar(seg.slice(0, corte).join("\n"));
    const proxIntro = compactar(seg.slice(corte).join("\n"));
    questoes.push({ numero: ini.numero, enunciado: intro ? `${intro} ${item}` : item, alternativas: [] });
    if (proxIntro) intro = proxIntro;
  });
  return { layout: "certo_errado", questoes, descartadas: [] };
}

export function parseProva(textoBruto: string): ResultadoParse {
  const texto = limparTexto(textoBruto).replace(/\r/g, "");
  const nMultipla = (texto.match(CABECALHO_QUESTAO_G) ?? []).length;
  if (nMultipla >= 3) return parseMultipla(texto);
  const ce = parseCertoErrado(texto);
  return ce.questoes.length >= 5 ? ce : { layout: "desconhecido", questoes: [], descartadas: [] };
}
