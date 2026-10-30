import { prisma } from "./db";
import { baixarPdf, extrairTextoPdf, resolverPdfDoEdital } from "./pdf";
import { escolherCargo, parseConteudoEdital, type DisciplinaEdital } from "./provas/parser/edital";

export { baixarPdf, extrairTextoPdf, resolverPdfDoEdital };

/** "BANCO DE DADOS" -> "Banco de Dados" (editais escrevem as disciplinas em caixa alta). */
export function tituloDisciplina(nome: string): string {
  const peq = new Set(["de", "da", "do", "das", "dos", "e", "em", "para", "a", "o", "no", "na"]);
  return nome
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => (i > 0 && peq.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

export type TemaCargo = { disciplina: string; topicos: string[] };

const paraTemas = (ds: DisciplinaEdital[]): TemaCargo[] => ds.map((d) => ({ disciplina: tituloDisciplina(d.nome), topicos: d.itens }));

/** Extrai, sem IA, os temas do cargo a partir do texto do edital (padrão "CARGO N: … DISCIPLINA: 1 item…"). */
export function temasDoEdital(texto: string, nomeCargo: string): TemaCargo[] {
  const conteudo = parseConteudoEdital(texto);
  const cargo = escolherCargo(nomeCargo, conteudo.cargos);
  if (!cargo) {
    if (conteudo.cargos.length === 0) throw new Error("Este edital não segue o padrão reconhecido (CARGO N: … DISCIPLINA: itens). Informe os tópicos manualmente.");
    throw new Error(`Não achei o cargo "${nomeCargo}" no edital. Cargos encontrados: ${conteudo.cargos.map((c) => c.nome).slice(0, 5).join(" | ")}`);
  }
  return paraTemas([...conteudo.gerais, ...cargo.disciplinas]);
}

export async function gravarTemas(cargoId: string, temas: TemaCargo[]) {
  await prisma.$transaction([
    prisma.tema.deleteMany({ where: { cargoId } }),
    prisma.tema.createMany({ data: temas.map((t) => ({ cargoId, disciplina: t.disciplina, topicos: JSON.stringify(t.topicos) })) }),
  ]);
}

/** Extrai e grava os temas do cargo (cache em Tema). */
export async function garantirTemas(cargoId: string, pdfBuffer?: Buffer): Promise<TemaCargo[]> {
  const existentes = await prisma.tema.findMany({ where: { cargoId } });
  if (existentes.length) return existentes.map((t) => ({ disciplina: t.disciplina, topicos: JSON.parse(t.topicos) as string[] }));

  const cargo = await prisma.cargo.findUniqueOrThrow({ where: { id: cargoId }, include: { concurso: true } });
  let buf = pdfBuffer;
  if (!buf) {
    if (!cargo.concurso.editalUrl) throw new Error("Este concurso ainda não tem edital oficial identificado. Envie o PDF, informe o link ou digite os tópicos.");
    buf = await baixarPdf(await resolverPdfDoEdital(cargo.concurso.editalUrl));
  }
  const texto = await extrairTextoPdf(buf);
  if (texto.trim().length < 500) throw new Error("O PDF parece escaneado (sem texto). OCR ainda não é suportado.");
  const temas = temasDoEdital(texto, cargo.nome);
  await gravarTemas(cargoId, temas);
  return temas;
}
