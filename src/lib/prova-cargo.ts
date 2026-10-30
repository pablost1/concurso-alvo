import { prisma } from "./db";
import { COMPETENCIAS, competenciaPorId, melhorCompetencia, nomeGrupo } from "./taxonomia/ti";
import { tokens } from "./provas/casar";

export type ItemPerfil = { competencia: string; nome: string; grupo: string; peso: number };
export type Perfil = { itens: ItemPerfil[]; fonte: "edital" | "historico" | "padrao" };

/** Normaliza contagens em pesos que somam 1, ordenados do maior para o menor. */
export function normalizarPesos(contagens: Map<string, number>): ItemPerfil[] {
  const total = [...contagens.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  return [...contagens.entries()]
    .map(([competencia, c]) => {
      const no = competenciaPorId(competencia);
      return { competencia, nome: no?.nome ?? competencia, grupo: nomeGrupo(competencia), peso: c / total };
    })
    .sort((a, b) => b.peso - a.peso);
}

/** Conta itens do edital por competência. O nome da disciplina entra só como reforço quando o item sozinho não diz nada. */
export function contarItens(temas: { disciplina: string; topicos: string[] }[]): Map<string, number> {
  const cont = new Map<string, number>();
  for (const t of temas) {
    for (const item of t.topicos) {
      const c = melhorCompetencia(item) ?? melhorCompetencia(`${t.disciplina} ${item}`);
      if (c) cont.set(c, (cont.get(c) ?? 0) + 1);
    }
  }
  return cont;
}

function perfilPadrao(): ItemPerfil[] {
  const c = new Map<string, number>();
  for (const n of COMPETENCIAS) if (!n.id.startsWith("ti.geral.")) c.set(n.id, 1);
  return normalizarPesos(c);
}

const SIMILARIDADE_MINIMA = 0.6;

/** Perfil de competências do cargo: edital do concurso → média de editais passados do mesmo cargo → perfil genérico de TI. */
export async function perfilDoCargo(cargoId: string): Promise<Perfil> {
  const temas = await prisma.tema.findMany({ where: { cargoId } });
  if (temas.length) {
    const itens = normalizarPesos(contarItens(temas.map((t) => ({ disciplina: t.disciplina, topicos: JSON.parse(t.topicos) as string[] }))));
    if (itens.length) return { itens, fonte: "edital" };
  }
  const cargo = await prisma.cargo.findUnique({ where: { id: cargoId } });
  if (cargo) {
    const alvo = new Set(tokens(cargo.nome));
    const rows = await prisma.conteudoEdital.findMany();
    const semelhantes = rows.filter((r) => {
      const t = new Set(tokens(r.cargoNome));
      const inter = [...alvo].filter((x) => t.has(x)).length;
      return inter / Math.max(1, Math.min(alvo.size, t.size)) >= SIMILARIDADE_MINIMA;
    });
    if (semelhantes.length) {
      const itens = normalizarPesos(contarItens(semelhantes.map((r) => ({ disciplina: r.disciplina, topicos: JSON.parse(r.itens) as string[] }))));
      if (itens.length) return { itens, fonte: "historico" };
    }
  }
  return { itens: perfilPadrao(), fonte: "padrao" };
}

/** Método do maior resto: reparte n questões proporcionalmente aos pesos. */
export function distribuir(perfil: ItemPerfil[], n: number): Map<string, number> {
  const base = perfil.map((p) => ({ id: p.competencia, exato: p.peso * n }));
  const quotas = new Map(base.map((b) => [b.id, Math.floor(b.exato)]));
  let sobra = n - [...quotas.values()].reduce((a, b) => a + b, 0);
  const restos = base.map((b) => ({ id: b.id, r: b.exato - Math.floor(b.exato) })).sort((a, b) => b.r - a.r);
  for (let i = 0; sobra > 0 && restos.length; i = (i + 1) % restos.length, sobra--) quotas.set(restos[i].id, (quotas.get(restos[i].id) ?? 0) + 1);
  return quotas;
}

export type Candidata = { id: string; competencia: string; hash: string | null; banca: string; ano: number | null; mesmoOrgao: boolean };
export type Cobertura = { competencia: string; nome: string; pedidas: number; entregues: number };

/**
 * Escolhe n questões seguindo o perfil. Dentro de cada competência prioriza mesmo órgão, mesma banca e provas recentes;
 * nunca repete enunciado (hash). Competências sem questões suficientes cedem a cota às demais do perfil.
 */
export function selecionar<T extends Candidata>(cands: T[], perfil: ItemPerfil[], n: number, banca?: string | null): { escolhidas: T[]; cobertura: Cobertura[] } {
  const quotas = distribuir(perfil, n);
  const jitter = () => Math.random() * 0.3;
  const score = (c: T) => (c.mesmoOrgao ? 3 : 0) + (banca && c.banca === banca.toLowerCase() ? 1 : 0) + ((c.ano ?? 2000) - 2000) / 50 + jitter();

  const porComp = new Map<string, T[]>();
  for (const c of cands) (porComp.get(c.competencia) ?? porComp.set(c.competencia, []).get(c.competencia)!).push(c);
  for (const lista of porComp.values()) lista.sort((a, b) => score(b) - score(a));

  const usados = new Set<string>();
  const hashes = new Set<string>();
  const escolhidas: T[] = [];
  const entregues = new Map<string, number>();
  const pegar = (comp: string, max: number) => {
    let tirou = 0;
    for (const c of porComp.get(comp) ?? []) {
      if (tirou >= max) break;
      if (usados.has(c.id) || (c.hash && hashes.has(c.hash))) continue;
      usados.add(c.id);
      if (c.hash) hashes.add(c.hash);
      escolhidas.push(c);
      tirou++;
    }
    entregues.set(comp, (entregues.get(comp) ?? 0) + tirou);
    return tirou;
  };

  for (const p of perfil) pegar(p.competencia, quotas.get(p.competencia) ?? 0);

  // Cota que sobrou: reaproveita competências do perfil (maior peso primeiro) que ainda têm questões.
  let faltam = n - escolhidas.length;
  for (const p of perfil) {
    if (faltam <= 0) break;
    faltam -= pegar(p.competencia, faltam);
  }

  const cobertura = perfil
    .map((p) => ({ competencia: p.competencia, nome: p.nome, pedidas: quotas.get(p.competencia) ?? 0, entregues: Math.min(entregues.get(p.competencia) ?? 0, quotas.get(p.competencia) ?? 0) }))
    .filter((c) => c.pedidas > 0);
  return { escolhidas, cobertura };
}

export const dominioPonderado = (perfil: ItemPerfil[], dominios: Map<string, number>) =>
  Math.round(perfil.reduce((s, p) => s + p.peso * (dominios.get(p.competencia) ?? 0), 0) * 1000) / 10;
