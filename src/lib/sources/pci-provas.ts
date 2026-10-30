import * as cheerio from "cheerio";
import { prisma } from "../db";
import { buscar } from "../http";
import { chaveOrgao, eCargoTI, norm, orgaoCasa } from "../provas/casar";

const BASE = "https://www.pciconcursos.com.br";
const VALIDADE_MS = 7 * 24 * 3600 * 1000;
const MAX_PAGINAS = 8;
const MAX_SECOES = 3;

export type ProvaPci = { id: string; url: string; cargo: string; ano: number | null; orgao: string; banca: string };
export type ProvasDoAlvo = {
  secoes: { slug: string; url: string }[];
  esteConcurso: (ProvaPci & { noBanco: boolean })[];
  outrosConcursos: (ProvaPci & { noBanco: boolean })[];
};

export const slugar = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Seções do PCI que provavelmente existem para o cargo: nome inteiro, sem sufixos e o "tipo base". */
export function slugsDoCargo(nomeCargo: string): string[] {
  const nome = nomeCargo.replace(/\bn[ií]vel (superior|m[eé]dio)\b/gi, "");
  // "Auditor Federal - Especialidade: TI - Ciência de Dados": o prefixo sozinho traria provas de outras especialidades.
  const segmentos = nome.split(/\s+[-–]\s+|\(|\)/).map((x) => x.replace(/^(especialidade|[aá]rea|op[cç][aã]o|sub[aá]rea)\s*:?\s*/i, "").trim()).filter(Boolean);
  const partes = segmentos.length > 1 ? [nome, ...segmentos.slice(1), segmentos.slice(1).join(" ")] : [nome];
  const t = norm(nome);
  if (/analista.*(desenvolvimento|sistemas)/.test(t)) partes.push("Analista de Sistemas");
  if (/analista.*(tecnologia da informa|\bti\b|\btic\b)/.test(t)) partes.push("Analista de Tecnologia da Informação");
  if (/tecnico.*(informatica|tecnologia da informa|\bti\b)/.test(t)) partes.push("Técnico em Informática");
  return [...new Set(partes.map(slugar).filter((x) => x.length >= 4))];
}

/** Tabela `#lista_provas` da seção de provas do PCI. */
export function parseTabelaProvas(html: string): { provas: ProvaPci[]; ultimaPagina: number } {
  const $ = cheerio.load(html);
  let ultimaPagina = 1;
  $(".pagination a.page-link[href]").each((_, a) => {
    const m = ($(a).attr("href") ?? "").match(/\/(\d+)$/);
    if (m) ultimaPagina = Math.max(ultimaPagina, parseInt(m[1], 10));
  });
  const provas: ProvaPci[] = [];
  $("#lista_provas tbody tr").each((_, tr) => {
    const a = $(tr).find("a.prova_download").first();
    const tds = $(tr).find("td");
    const href = a.attr("href");
    if (!href || tds.length < 4) return;
    const url = new URL(href, BASE).toString();
    const ano = parseInt($(tds[1]).text().trim(), 10);
    provas.push({
      id: url.replace(/\/$/, "").split("/").pop()!,
      url,
      cargo: a.text().replace(/\s+/g, " ").trim(),
      ano: Number.isFinite(ano) ? ano : null,
      orgao: $(tds[2]).text().trim(),
      banca: $(tds[3]).text().trim(),
    });
  });
  return { provas, ultimaPagina };
}

/** Separa as provas pelo órgão do concurso-alvo; "outros" priorizam a mesma banca e o ano mais recente. */
export function separarProvas<T extends ProvaPci>(provas: T[], concurso: { orgao: string; titulo: string; banca: string | null }) {
  const texto = `${concurso.orgao} ${concurso.titulo}`;
  const banca = concurso.banca ? norm(concurso.banca) : null;
  const recentes = (a: ProvaPci, b: ProvaPci) => (b.ano ?? 0) - (a.ano ?? 0);
  const esteConcurso: T[] = [], outrosConcursos: T[] = [];
  for (const p of provas) {
    const chave = chaveOrgao(p.orgao);
    (chave && orgaoCasa(texto, chave) ? esteConcurso : outrosConcursos).push(p);
  }
  const mesmaBanca = (p: ProvaPci) => (banca && norm(p.banca) === banca ? 1 : 0);
  esteConcurso.sort(recentes);
  outrosConcursos.sort((a, b) => mesmaBanca(b) - mesmaBanca(a) || recentes(a, b));
  return { esteConcurso, outrosConcursos };
}

async function carregarSecao(slug: string): Promise<boolean> {
  const secao = await prisma.secaoPci.findUnique({ where: { slug } });
  if (secao && Date.now() - secao.buscadoEm.getTime() < VALIDADE_MS) return secao.existe;

  const todas: ProvaPci[] = [];
  let existe = false;
  try {
    const primeira = parseTabelaProvas(await (await buscar(`${BASE}/provas/${slug}`)).text());
    existe = primeira.provas.length > 0;
    todas.push(...primeira.provas);
    for (let p = 2; existe && p <= Math.min(primeira.ultimaPagina, MAX_PAGINAS); p++) {
      todas.push(...parseTabelaProvas(await (await buscar(`${BASE}/provas/${slug}/${p}`)).text()).provas);
    }
  } catch (e) {
    // 404 = seção inexistente; outras falhas não ficam em cache.
    if (!/HTTP 404/.test((e as Error).message)) throw e;
  }
  for (const p of todas) {
    const d = { slug, url: p.url, cargo: p.cargo, ano: p.ano, orgao: p.orgao, banca: p.banca, buscadoEm: new Date() };
    await prisma.provaPci.upsert({ where: { id_slug: { id: p.id, slug } }, create: { id: p.id, ...d }, update: d });
  }
  await prisma.secaoPci.upsert({ where: { slug }, create: { slug, existe }, update: { existe, buscadoEm: new Date() } });
  return existe;
}

export async function provasParaAlvo(alvoId: string, userId: string): Promise<ProvasDoAlvo | null> {
  const alvo = await prisma.alvo.findFirst({ where: { id: alvoId, userId }, include: { cargo: { include: { concurso: true } } } });
  if (!alvo) return null;

  const secoes: { slug: string; url: string }[] = [];
  for (const slug of slugsDoCargo(alvo.cargo.nome).slice(0, 6)) {
    if (secoes.length >= MAX_SECOES) break;
    if (await carregarSecao(slug)) secoes.push({ slug, url: `${BASE}/provas/${slug}` });
  }

  const linhas = await prisma.provaPci.findMany({ where: { slug: { in: secoes.map((s) => s.slug) } } });
  const ti = eCargoTI(alvo.cargo.nome);
  const unicas = [...new Map(linhas.map((l) => [l.id, l])).values()].filter((l) => !ti || eCargoTI(l.cargo));
  const noBanco = new Set(
    (await prisma.prova.findMany({ where: { provaUrl: { startsWith: "provas-ads:" } }, select: { provaUrl: true } })).map((p) => p.provaUrl.slice("provas-ads:".length)),
  );
  const todas = unicas.map((l) => ({ id: l.id, url: l.url, cargo: l.cargo, ano: l.ano, orgao: l.orgao, banca: l.banca, noBanco: noBanco.has(l.id) }));
  return { secoes, ...separarProvas(todas, alvo.cargo.concurso) };
}
