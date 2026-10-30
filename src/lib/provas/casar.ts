import { classificarArea } from "../areas";

const STOP = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas", "a", "o", "as", "os", "para", "por", "com", "ao",
  "um", "uma", "sobre", "conceitos", "nocoes", "noes", "basicos", "geral", "gerais", "conhecimentos", "area", "areas", "cargo",
]);

const GENERICOS = new Set(["analista", "tecnico", "assistente", "auxiliar", "judiciario", "especialidade", "especializado", "apoio", "publico", "agente", "oficial", "nivel", "superior", "medio"]);

export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Tokens normalizados (sem acento, sem stopwords, plural simples removido). */
export function tokens(s: string): string[] {
  return norm(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}

/** "ABIN 2017" -> "abin"; "TJ_CE_18_JUIZ" -> "tj ce juiz" (anos e números saem). */
export function chaveOrgao(nome: string): string {
  return norm(nome)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t))
    .join(" ");
}

const UFS: Record<string, string> = {
  ac: "acre", al: "alagoas", ap: "amapa", am: "amazonas", ba: "bahia", ce: "ceara", df: "distrito federal", es: "espirito santo",
  go: "goias", ma: "maranhao", mt: "mato grosso", ms: "mato grosso do sul", mg: "minas gerais", pa: "para", pb: "paraiba",
  pr: "parana", pe: "pernambuco", pi: "piaui", rj: "rio de janeiro", rn: "rio grande do norte", rs: "rio grande do sul",
  ro: "rondonia", rr: "roraima", sc: "santa catarina", sp: "sao paulo", se: "sergipe", to: "tocantins",
};

/** Siglas estaduais do padrão "SIGLA/UF" (como o PCI escreve) e o nome por extenso que o concurso costuma usar. */
const SIGLAS_ESTADUAIS: Record<string, string> = {
  dpe: "defensoria publica", mpe: "ministerio publico", mp: "ministerio publico", tj: "tribunal justica",
  tce: "tribunal contas", tre: "tribunal regional eleitoral", crea: "conselho regional engenharia",
};

/** Órgãos federais: sigla (chave) -> palavras do nome por extenso. */
const FEDERAIS: Record<string, string> = {
  ibge: "instituto brasileiro geografia estatistica", serpro: "servico federal processamento dados",
  embrapa: "empresa brasileira pesquisa agropecuaria", anatel: "agencia nacional telecomunicacoes",
  antt: "agencia nacional transportes terrestres", ans: "agencia nacional saude suplementar",
  finep: "financiadora estudos projetos", cvm: "comissao valores mobiliarios", cnmp: "conselho nacional ministerio publico",
  incra: "instituto nacional colonizacao reforma agraria", conder: "companhia desenvolvimento urbano estado bahia",
  correios: "empresa brasileira correios telegrafos",
};

type Requisito = { todos: string[]; nenhum: string[]; frase?: string };
const palavras = (s: string) => s.split(" ").filter(Boolean);

/** Formas equivalentes de reconhecer o órgão (chave) no texto de um concurso; basta uma ser satisfeita. */
function requisitos(chave: string): Requisito[] {
  const partes = palavras(chave);
  const lista: Requisito[] = [{ todos: partes, nenhum: [] }];
  const [sigla, uf] = partes;
  if (partes.length === 2 && SIGLAS_ESTADUAIS[sigla] && UFS[uf]) {
    // "mato grosso" não pode casar com "mato grosso do sul"
    lista.push({ todos: [...palavras(SIGLAS_ESTADUAIS[sigla]), ...palavras(UFS[uf])], nenhum: uf === "mt" ? ["sul"] : [] });
  }
  if (FEDERAIS[chave]) lista.push({ todos: palavras(FEDERAIS[chave]), nenhum: [] });
  // "Pref. Boa Vista/RR - SMAG" -> prefeitura + cidade ("Câm." idem, com câmara)
  const m = chave.match(/^(pref|cam|camara) (.+?)( [a-z]{2})?( [a-z]+)?$/);
  if (m && partes.length >= 3) {
    const cidade = palavras(m[2]).filter((p) => !UFS[p] || p.length > 2);
    if (cidade.length) lista.push({ todos: [], nenhum: [], frase: `${m[1] === "pref" ? "prefeitura" : "camara"} de ${cidade.join(" ")}` });
  }
  return lista;
}

/** O órgão da prova (chave) aparece no texto do concurso atual (órgão + título), por sigla ou por nome por extenso. */
export function orgaoCasa(textoConcurso: string, chave: string): boolean {
  const ps = norm(textoConcurso).split(/[^a-z0-9]+/).filter(Boolean);
  const alvo = new Set(ps);
  const texto = ` ${ps.join(" ")} `;
  return requisitos(chave).some((r) =>
    r.frase ? texto.includes(` ${r.frase} `) : r.todos.length > 0 && r.todos.every((p) => alvo.has(p)) && !r.nenhum.some((p) => alvo.has(p)),
  );
}

/** Prova sem área (conhecimentos gerais) serve a qualquer cargo; senão área igual ou nomes parecidos. */
export function cargoCompativel(
  prova: { area: string | null; cargoNome: string },
  cargo: { area: string; nome: string },
): boolean {
  if (!prova.area || prova.area === "outras") return true;
  if (prova.area === cargo.area) return true;
  // Palavras comuns a quase todo cargo do serviço público não indicam parentesco entre cargos.
  const especifico = (t: string) => !GENERICOS.has(t);
  const a = new Set(tokens(prova.cargoNome).filter(especifico));
  return tokens(cargo.nome).filter(especifico).some((t) => a.has(t));
}

/** O nome do cargo/especialidade é de Tecnologia da Informação? */
export function eCargoTI(nome: string): boolean {
  const t = norm(nome);
  return /tecnologia da informa|\bti\b|informatica|sistemas? de informa|analista de sistemas|desenvolvedor|desenvolvimento de sistemas|programador|ciencia de dados|cientista de dados|seguranca da informa|redes de computadores|infraestrutura de (ti|tic)|suporte (tecnico )?(de )?(ti|informatica)|telecomunica|computacao|banco de dados|engenharia de software|arquiteto de (software|solucoes)|ciberseguranca|governanca de ti|\btic\b|\bdba\b/.test(t);
}

export function areaDoCargo(nome: string): string | null {
  const a = classificarArea(nome);
  return a && a !== "outras" ? a : null;
}

const jaccard = (a: string[], b: string[]) => {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let i = 0;
  for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i);
};

export type TemaEdital = { disciplina: string; topicos: string[] };
export type QuestaoParaCasar = { disciplina: string; topico: string; enunciado: string };
export type Casamento = { disciplina: string; topico: string; pontos: number };

/**
 * Pontua o quanto uma questão de prova cobre algum tópico do edital do cargo-alvo.
 * Disciplina parecida pesa mais; depois a sobreposição de palavras do tópico/enunciado.
 */
export function melhorTema(q: QuestaoParaCasar, temas: TemaEdital[]): Casamento | null {
  const tq = tokens(q.topico);
  const tEnun = new Set(tokens(q.enunciado));
  const dq = tokens(q.disciplina);
  let melhor: Casamento | null = null;
  for (const t of temas) {
    const dJ = jaccard(dq, tokens(t.disciplina));
    const dPontos = dJ >= 0.5 ? 3 : dJ > 0 ? 1.5 : 0;
    for (const topico of t.topicos) {
      const tt = tokens(topico);
      const tPontos = jaccard(tq, tt) * 3 + (tt.length ? tt.filter((x) => tEnun.has(x)).length / tt.length : 0);
      const pontos = dPontos + tPontos;
      if (!melhor || pontos > melhor.pontos) melhor = { disciplina: t.disciplina, topico, pontos };
    }
  }
  return melhor;
}

export const LIMIAR_CORRELATA = 3;
