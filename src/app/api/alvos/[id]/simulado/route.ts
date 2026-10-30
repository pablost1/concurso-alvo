import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { montarSimulado, type ModoSimulado } from "@/lib/provas/simulado";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const pedido = url.searchParams.get("modo");
  const modo: ModoSimulado = pedido === "concurso" || pedido === "cruzado" ? pedido : "cargo";
  const n = Math.min(80, Math.max(5, parseInt(url.searchParams.get("n") ?? "20", 10) || 20));
  const r = await montarSimulado(userId, id, modo, n);
  if (!r) return NextResponse.json({ erro: "alvo não encontrado" }, { status: 404 });
  // Gabarito nunca é enviado: só volta ao responder.
  return NextResponse.json(r);
}
