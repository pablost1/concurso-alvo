import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { montarPratica } from "@/lib/provas/simulado";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const competencia = new URL(req.url).searchParams.get("competencia");
  const r = await montarPratica(userId, id, competencia);
  if (!r) return NextResponse.json({ erro: "alvo não encontrado" }, { status: 404 });
  return NextResponse.json(r);
}
