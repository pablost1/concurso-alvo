import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";
import { buscar } from "./http";

export async function baixarPdf(url: string): Promise<Buffer> {
  const res = await buscar(url, { timeoutMs: 120000 });
  return Buffer.from(await res.arrayBuffer());
}

export async function extrairTextoPdf(buf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const { text } = await parser.getText();
    return text;
  } finally {
    await parser.destroy();
  }
}

/** Se a URL for uma página HTML da banca, procura nela o link de PDF do edital. */
export async function resolverPdfDoEdital(url: string): Promise<string> {
  if (/\.pdf($|\?)/i.test(url)) return url;
  const res = await buscar(url, { timeoutMs: 30000 });
  if ((res.headers.get("content-type") ?? "").includes("pdf")) return url;
  const $ = cheerio.load(await res.text());
  const candidatos: { href: string; peso: number }[] = [];
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href")!;
    const txt = `${$(a).text()} ${href}`.toLowerCase();
    if (!/\.pdf|edital/.test(txt)) return;
    let abs: string;
    try { abs = new URL(href, url).href; } catch { return; }
    let peso = 0;
    if (/\.pdf/.test(abs.toLowerCase())) peso += 2;
    if (/edital/.test(txt)) peso += 2;
    if (/abertura|completo|publica/.test(txt)) peso += 1;
    if (/retifica|errata|resultado|gabarito/.test(txt)) peso -= 3;
    candidatos.push({ href: abs, peso });
  });
  candidatos.sort((a, b) => b.peso - a.peso);
  if (!candidatos.length || candidatos[0].peso < 2) throw new Error("Não encontrei o PDF do edital nessa página. Envie o link direto do PDF.");
  return candidatos[0].href;
}
