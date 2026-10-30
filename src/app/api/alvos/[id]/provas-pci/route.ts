import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { provasParaAlvo } from "@/lib/sources/pci-provas";

export const maxDuration = 120;

/** Só lista as páginas de provas do PCI (links); o download do PDF é feito pelo próprio usuário no site. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const r = await provasParaAlvo(id, userId);
    if (!r) return NextResponse.json({ erro: "alvo não encontrado" }, { status: 404 });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ erro: `Não foi possível consultar o PCI Concursos agora: ${(e as Error).message}` }, { status: 502 });
  }
}
