import * as cheerio from "cheerio";
import { USER_AGENT } from "./pci";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const DOMINIO_OFICIAL = /(\.gov\.br|\.jus\.br|\.leg\.br|\.mp\.br|\.def\.br|\.edu\.br|\.org\.br|\.mil\.br|\.com\.br|\.net\.br|\.br)(\/|$)/;
const BANCAS_CONHECIDAS = /(cebraspe|cespe|fgv|fcc\.org|vunesp|cesgranrio|idecan|ibfc|quadrix|institutoaocp|consulpam|iades|fundatec|ibam|objetivas|selecon|fepese|consulplan|institutomais|funcab|ibade|legalle|ufpr|nucepe|fundep|cetro|cops)/;
const STOP = new Set(["de", "da", "do", "das", "dos", "e", "prefeitura", "municipal", "camara", "governo", "estado", "concurso", "publico", "instituto", "universidade", "federal", "tribunal"]);

export type Verificacao = { verificado: boolean; url: string | null };

/**
 * Confirma na fonte oficial (site da banca/órgão citado no texto do PCI) que o concurso existe:
 * a página precisa responder e mencionar o órgão e a palavra "edital"/"concurso".
 */
export async function verificarConcurso(orgao: string, linksOficiais: string[]): Promise<Verificacao> {
  const tokens = norm(orgao).split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOP.has(t));
  for (const link of linksOficiais.slice(0, 3)) {
    try {
      const u = new URL(link);
      if (!DOMINIO_OFICIAL.test(u.host + "/")) continue;
      // Página inicial genérica não confirma um concurso específico.
      const generica = u.pathname.replace(/\/+$/, "") === "" && !u.search;
      if (generica) continue;
      const res = await fetch(link, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20000), redirect: "follow" });
      if (!res.ok) continue;
      if ((res.headers.get("content-type") ?? "").includes("pdf")) return { verificado: true, url: link };
      // Páginas de bancas conhecidas costumam ser renderizadas por JS: a página específica existir (200) já confirma.
      if (BANCAS_CONHECIDAS.test(u.host)) return { verificado: true, url: link };
      const $ = cheerio.load(await res.text());
      const texto = norm($("body").text());
      const orgaoOk = tokens.length === 0 || tokens.some((t) => texto.includes(t));
      if (orgaoOk && /edital|concurso|processo seletivo/.test(texto)) return { verificado: true, url: link };
    } catch {
      /* tenta o próximo link */
    }
  }
  return { verificado: false, url: null };
}
