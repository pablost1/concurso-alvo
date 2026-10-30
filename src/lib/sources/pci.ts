import * as cheerio from "cheerio";

export const USER_AGENT = "ConcursoAlvoBot/0.1 (+uso pessoal; respeita robots.txt)";
const BASE = "https://www.pciconcursos.com.br";

export type ItemListagem = {
  url: string;
  orgao: string;
  titulo: string;
  uf: string;
  vagas: number | null;
  salario: string | null;
  cargos: string[]; // vazio quando "Vários Cargos"
  escolaridade: string | null;
  inscricoesAte: Date | null;
};

export type CargoDetalhe = { nome: string; vagas: number | null };

export type DetalheConcurso = {
  cargos: CargoDetalhe[];
  banca: string | null;
  linksOficiais: string[]; // links externos ao PCI citados no texto (site da banca/órgão)
};

const BANCAS = ["cebraspe", "fgv", "fcc", "vunesp", "cesgranrio", "idecan", "ibfc", "quadrix", "aocp", "instituto-aocp", "consulpam", "iades", "fundatec", "ibam", "legalle", "objetiva", "selecon", "fepese", "consulplan", "ufpe", "ufrj", "unesp", "uerj"];

function parseData(txt: string): Date | null {
  const m = txt.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 23, 59)) : null;
}

export function parseListagem(html: string): ItemListagem[] {
  const $ = cheerio.load(html);
  const itens: ItemListagem[] = [];
  let uf = "BR";
  $("#conteudo").find("div.ua, div.na, div.da").each((_, el) => {
    const $el = $(el);
    if ($el.hasClass("ua")) {
      const id = $el.attr("id") ?? "";
      uf = id === "NACIONAL" ? "BR" : id.slice(0, 2).toUpperCase();
      return;
    }
    const a = $el.find(".ca a").first();
    const url = a.attr("href");
    if (!url) return;
    const cd = $el.find(".cd").first();
    const vagasSal = cd.contents().first().text(); // "184 vagas até R$ 32.070,88"
    const vagasM = vagasSal.match(/([\d.]+)\s+vagas?/i);
    const salM = vagasSal.match(/R\$\s*[\d.,]+/);
    const spans = cd.find("span");
    const cargosTxt = spans.first().contents().first().text().trim();
    const escolaridade = spans.last().text().trim() || null;
    itens.push({
      url,
      orgao: a.text().trim(),
      titulo: a.attr("title")?.trim() ?? a.text().trim(),
      uf,
      vagas: vagasM ? parseInt(vagasM[1].replace(/\./g, ""), 10) : null,
      salario: salM ? salM[0] : null,
      cargos: /v[aá]rios cargos/i.test(cargosTxt) || !cargosTxt ? [] : cargosTxt.split(",").map((c) => c.trim()).filter(Boolean),
      escolaridade,
      inscricoesAte: parseData($el.find(".ce").text()),
    });
  });
  return itens;
}

export function parseDetalhe(html: string): DetalheConcurso {
  const $ = cheerio.load(html);
  const artigo = $("article").first();
  const cargos: CargoDetalhe[] = [];
  artigo.find("ul li").each((_, li) => {
    const txt = $(li).text().trim();
    if (!txt || txt.length > 200) return;
    const m = txt.match(/\(?\s*(\d[\d.]*)\s+vagas?[^)]*\)?\s*$/i);
    const nome = txt.replace(/\s*\(?\s*\d[\d.]*\s+vagas?[^)]*\)?\s*$/i, "").replace(/[;.,]\s*$/, "").trim();
    if (nome) cargos.push({ nome, vagas: m ? parseInt(m[1].replace(/\./g, ""), 10) : null });
  });

  const linksOficiais = new Set<string>();
  artigo.find("a[href^='http']").each((_, a) => {
    const href = $(a).attr("href")!;
    if (!/pciconcursos\.com\.br|pci\.app\.br/.test(href)) linksOficiais.add(href);
  });

  let banca: string | null = null;
  const proxima = $("a[href*='/provas/']").first().attr("href")?.split("/provas/")[1]?.replace(/\/$/, "");
  if (proxima) banca = proxima;
  if (!banca) {
    const alvo = [...linksOficiais].join(" ").toLowerCase();
    banca = BANCAS.find((b) => alvo.includes(b)) ?? null;
  }
  return { cargos, banca, linksOficiais: [...linksOficiais] };
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function baixar(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.text();
}

export async function coletarListagem(): Promise<ItemListagem[]> {
  return parseListagem(await baixar(`${BASE}/concursos/`));
}

export async function coletarDetalhe(url: string, atrasoMs = 1200): Promise<DetalheConcurso> {
  await dormir(atrasoMs);
  return parseDetalhe(await baixar(url));
}
