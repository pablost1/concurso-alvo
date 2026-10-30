import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { garantirTemas, gravarTemas, tituloDisciplina } from "@/lib/edital";
import { separarItens } from "@/lib/provas/parser/edital";

export const maxDuration = 300;

/** "Banco de Dados: 1 SQL. 2 Normalização" por linha -> temas. Também aceita itens separados por ";". */
function temasDoTexto(texto: string) {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      if (i < 1) return null;
      const bruto = l.slice(i + 1);
      const itens = /\d+\s+[A-ZÀ-Ú]/.test(bruto) ? separarItens(bruto) : bruto.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
      return itens.length ? { disciplina: tituloDisciplina(l.slice(0, i)), topicos: itens } : null;
    })
    .filter((x): x is { disciplina: string; topicos: string[] } => x !== null);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const alvo = await prisma.alvo.findFirst({ where: { id, userId } });
  if (!alvo) return NextResponse.json({ erro: "alvo não encontrado" }, { status: 404 });
  try {
    const tipo = req.headers.get("content-type") ?? "";
    if (tipo.includes("application/json")) {
      const { texto } = (await req.json()) as { texto?: string };
      const temas = temasDoTexto(texto ?? "");
      if (!temas.length) return NextResponse.json({ erro: "Use o formato: Disciplina: item 1; item 2 (uma disciplina por linha)" }, { status: 400 });
      await gravarTemas(alvo.cargoId, temas);
      return NextResponse.json({ disciplinas: temas });
    }
    let pdf: Buffer | undefined;
    if (tipo.includes("multipart/form-data")) {
      const f = (await req.formData()).get("pdf");
      if (f instanceof File && f.size > 0) {
        if (f.size > 30 * 1024 * 1024) return NextResponse.json({ erro: "PDF acima de 30 MB" }, { status: 413 });
        pdf = Buffer.from(await f.arrayBuffer());
      }
    }
    return NextResponse.json({ disciplinas: await garantirTemas(alvo.cargoId, pdf) });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 422 });
  }
}
