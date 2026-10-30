import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { getUserId } from "@/lib/session";

const TIPOS: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

/** Figuras das provas importadas do provas-ads, lidas direto da pasta de origem (sem copiar para o projeto). */
export async function GET(_req: Request, ctx: { params: Promise<{ caminho: string[] }> }) {
  if (!(await getUserId())) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const { caminho } = await ctx.params;
  const tipo = TIPOS[extname(caminho.at(-1) ?? "").toLowerCase()];
  if (!tipo) return NextResponse.json({ erro: "tipo não suportado" }, { status: 400 });

  const base = resolve(process.env.PROVAS_ADS_DIR ?? "../provas-ads/out", "imagens");
  const arquivo = resolve(base, ...caminho);
  // Impede sair da pasta de imagens (../, caminhos absolutos).
  if (!arquivo.startsWith(base + sep)) return NextResponse.json({ erro: "caminho inválido" }, { status: 400 });
  try {
    const dados = await readFile(arquivo);
    return new Response(new Uint8Array(dados), { headers: { "Content-Type": tipo, "Cache-Control": "private, max-age=86400" } });
  } catch {
    return NextResponse.json({ erro: "imagem não encontrada" }, { status: 404 });
  }
}
