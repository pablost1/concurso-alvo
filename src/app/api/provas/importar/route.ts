import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/session";
import { lerProva } from "@/lib/provas/extrair";
import { criarProvaManual, salvarQuestoes } from "@/lib/provas/sync";
import { prisma } from "@/lib/db";

export const maxDuration = 300;

const Meta = z.object({
  orgao: z.string().trim().min(2, "Informe o órgão"),
  banca: z.string().trim().min(2, "Informe a banca"),
  cargo: z.string().trim().min(2, "Informe o cargo"),
  ano: z.coerce.number().int().min(1990).max(2100).optional(),
});

const MAX = 30 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await getUserId())) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ erro: "envie multipart/form-data" }, { status: 400 });

  const meta = Meta.safeParse({
    orgao: form.get("orgao"), banca: form.get("banca"), cargo: form.get("cargo"), ano: form.get("ano") || undefined,
  });
  if (!meta.success) return NextResponse.json({ erro: meta.error.issues[0].message }, { status: 400 });

  const prova = form.get("prova"), gabarito = form.get("gabarito");
  if (!(prova instanceof File) || prova.size === 0) return NextResponse.json({ erro: "envie o PDF da prova" }, { status: 400 });
  if (!(gabarito instanceof File) || gabarito.size === 0) return NextResponse.json({ erro: "envie o PDF do gabarito" }, { status: 400 });
  if (prova.size > MAX || gabarito.size > MAX) return NextResponse.json({ erro: "PDF acima de 30 MB" }, { status: 413 });

  const registro = await criarProvaManual({ orgao: meta.data.orgao, banca: meta.data.banca, ano: meta.data.ano ?? null, cargoNome: meta.data.cargo });
  try {
    const questoes = await lerProva({
      provaPdf: Buffer.from(await prova.arrayBuffer()),
      gabaritoPdf: Buffer.from(await gabarito.arrayBuffer()),
    });
    await salvarQuestoes(registro.id, questoes);
    return NextResponse.json({ provaId: registro.id, questoes: questoes.length });
  } catch (e) {
    await prisma.prova.update({ where: { id: registro.id }, data: { status: "erro", erro: (e as Error).message.slice(0, 500) } });
    return NextResponse.json({ erro: (e as Error).message }, { status: 422 });
  }
}
