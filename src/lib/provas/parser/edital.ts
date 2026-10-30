import { limparTexto } from "./limpar";

export type DisciplinaEdital = { nome: string; itens: string[] };
export type CargoEdital = { numeros: number[]; nome: string; disciplinas: DisciplinaEdital[] };
export type ConteudoEdital = { gerais: DisciplinaEdital[]; cargos: CargoEdital[] };

const SEM_MINUSCULAS = (s: string) => !/[a-zà-ú]/.test(s);
const RE_CARGO = /^CARGOS?\s+(\d+(?:\s*(?:,|e|a)\s*\d+)*)\s*[:\-–]\s*(.*)$/i;
const RE_DISC = /^([A-ZÀ-Ú][A-ZÀ-Ú0-9 ,\-–\/()ªº.&'"]{2,160}?):\s*(.*)$/;
const RE_GERAIS = /^(?:\d+(?:\.\d+)*\s+)?CONHECIMENTOS (?:GERAIS|B[ÁA]SICOS)(?: PARA TODOS OS CARGOS)?\s*$/i;

/** Separa "1 Item. 2 Item. 2.1 Subitem" em itens, sem a numeração. */
export function separarItens(texto: string): string[] {
  const t = texto.replace(/\s+/g, " ").trim();
  if (!t) return [];
  return t
    .split(/\s(?=\d{1,2}(?:\.\d{1,2}){0,3}\s+(?:[A-ZÀ-Ú(]))/)
    .map((x) => x.replace(/^\d{1,2}(?:\.\d{1,2}){0,3}\s+/, "").replace(/[;.,\s]+$/, "").trim())
    .filter((x) => x.length > 1);
}

function recortarSecao(texto: string): string {
  const ini = [...texto.matchAll(/^\s*\d+(?:\.\d+)*\s+DOS OBJETOS DE AVALIA[ÇC][ÃA]O\b.*$/gim)].pop();
  if (!ini || ini.index === undefined) return texto;
  const resto = texto.slice(ini.index + ini[0].length);
  const fim = resto.search(/^\s*\d{1,2}\s+(?:DOS?|DAS?|DE)\s+[A-ZÀ-Ú]{3,}/m);
  return fim > 500 ? resto.slice(0, fim) : resto;
}

/**
 * Conteúdo programático no padrão "CARGO N: nome" → "DISCIPLINA EM CAIXA ALTA: 1 item. 2 item…"
 * (formato dos editais do Cebraspe). Retorna vazio se o edital não seguir o padrão.
 */
export function parseConteudoEdital(textoBruto: string): ConteudoEdital {
  const linhas = limparTexto(textoBruto).split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const secao = recortarSecao(linhas.join("\n")).split("\n");

  const gerais: DisciplinaEdital[] = [];
  const cargos: CargoEdital[] = [];
  let alvo: DisciplinaEdital[] | null = null;
  let atual: { nome: string; texto: string } | null = null;

  const fechar = () => {
    if (atual && alvo) {
      const itens = separarItens(atual.texto);
      if (itens.length) alvo.push({ nome: atual.nome.replace(/\s+/g, " ").trim(), itens });
    }
    atual = null;
  };

  for (let i = 0; i < secao.length; i++) {
    const l = secao[i];
    if (RE_GERAIS.test(l)) { fechar(); alvo = gerais; continue; }
    const mc = l.match(RE_CARGO);
    if (mc && /^[A-ZÀ-Ú]/.test(mc[2])) {
      fechar();
      let nome = mc![2];
      // O nome do cargo pode continuar na linha seguinte ("...TECNOLOGIA DA" / "INFORMAÇÃO").
      while (i + 1 < secao.length && SEM_MINUSCULAS(secao[i + 1]) && !RE_DISC.test(secao[i + 1]) && !RE_CARGO.test(secao[i + 1]) && secao[i + 1].length < 80) {
        nome += ` ${secao[++i]}`;
      }
      const numeros = [...mc![1].matchAll(/\d+/g)].map((x) => parseInt(x[0], 10));
      if (/\ba\b/i.test(mc![1]) && numeros.length === 2) for (let n = numeros[0] + 1; n < numeros[1]; n++) numeros.push(n);
      const cargo: CargoEdital = { numeros, nome: nome.replace(/\s+/g, " ").trim(), disciplinas: [] };
      cargos.push(cargo);
      alvo = cargo.disciplinas;
      continue;
    }
    // Título de disciplina quebrado em duas linhas (a primeira sem ":" e em caixa alta).
    let linha = l;
    if (!RE_DISC.test(linha) && SEM_MINUSCULAS(linha) && linha.length > 8 && i + 1 < secao.length && !RE_CARGO.test(secao[i + 1])) {
      const junta = `${linha} ${secao[i + 1]}`;
      const m = junta.match(RE_DISC);
      if (m && SEM_MINUSCULAS(m[1])) { linha = junta; i++; }
    }
    const md = linha.match(RE_DISC);
    if (md && SEM_MINUSCULAS(md[1]) && /^\d|^$/.test(md[2].trim().charAt(0) || "")) {
      fechar();
      atual = { nome: md[1], texto: md[2] };
      continue;
    }
    if (atual) atual.texto += ` ${l}`;
  }
  fechar();
  return { gerais, cargos: cargos.filter((c) => c.disciplinas.length > 0) };
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const toks = (s: string) => new Set(norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3));

/** Escolhe, no edital, o bloco do cargo que mais se parece com o nome informado (null se nada convence). */
export function escolherCargo(nomeCargo: string, cargos: CargoEdital[]): CargoEdital | null {
  const alvo = toks(nomeCargo);
  let melhor: { c: CargoEdital; s: number } | null = null;
  for (const c of cargos) {
    const t = toks(c.nome);
    const inter = [...alvo].filter((x) => t.has(x)).length;
    const s = inter / Math.max(1, Math.min(alvo.size, t.size));
    if (!melhor || s > melhor.s) melhor = { c, s };
  }
  return melhor && melhor.s >= 0.6 ? melhor.c : null;
}
