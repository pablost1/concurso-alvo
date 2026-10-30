import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";
import {
  atualizarRecentes, atualizarStreak, calcularDominio, calcularNivel, calcularProficiencia, calcularXp,
} from "@/lib/gamificacao";
import { dominioPonderado, perfilDoCargo, type ItemPerfil } from "@/lib/prova-cargo";
import { competenciaPorId } from "@/lib/taxonomia/ti";

const Body = z
  .object({
    questaoId: z.string().optional(),
    questaoProvaId: z.string().optional(),
    alvoId: z.string().optional(), // obrigatório para questões de prova
    escolhida: z.number().int().min(0),
  })
  .refine((b) => Boolean(b.questaoId) !== Boolean(b.questaoProvaId), "informe questaoId ou questaoProvaId");

type Alvo = { cargoId: string };

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });

  // Normaliza os dois tipos de questão para a mesma estrutura.
  let q: {
    cargoId: string; disciplina: string | null; topico: string | null; dificuldade: number;
    alternativas: string[]; correta: number; explicacao: string;
    chaveDedup: { questaoId: string } | { questaoProvaId: string };
    perfil?: ItemPerfil[]; // questões de prova: progresso por competência do perfil
  };

  if (body.data.questaoId) {
    const questao = await prisma.questao.findUnique({ where: { id: body.data.questaoId } });
    if (!questao) return NextResponse.json({ erro: "questão não encontrada" }, { status: 404 });
    const alvo: Alvo | null = await prisma.alvo.findFirst({ where: { userId, cargoId: questao.cargoId } });
    if (!alvo) return NextResponse.json({ erro: "cargo não está nos seus alvos" }, { status: 403 });
    q = {
      cargoId: questao.cargoId, disciplina: questao.disciplina, topico: questao.topico, dificuldade: questao.dificuldade,
      alternativas: JSON.parse(questao.alternativas), correta: questao.correta, explicacao: questao.explicacao,
      chaveDedup: { questaoId: questao.id },
    };
  } else {
    if (!body.data.alvoId) return NextResponse.json({ erro: "alvoId é obrigatório" }, { status: 400 });
    const alvo = await prisma.alvo.findFirst({
      where: { id: body.data.alvoId, userId },
      include: { cargo: { include: { temas: true } } },
    });
    if (!alvo) return NextResponse.json({ erro: "alvo não encontrado" }, { status: 404 });
    const qp = await prisma.questaoProva.findUnique({ where: { id: body.data.questaoProvaId! }, include: { prova: true } });
    if (!qp || qp.correta === null || qp.anulada) return NextResponse.json({ erro: "questão indisponível" }, { status: 404 });
    const perfil = (await perfilDoCargo(alvo.cargoId)).itens;
    const comp = qp.competencia && competenciaPorId(qp.competencia) ? qp.competencia : null;
    const letra = qp.tipo === "certo_errado" ? (qp.correta === 0 ? "Certo" : "Errado") : String.fromCharCode(65 + qp.correta);
    q = {
      cargoId: alvo.cargoId, disciplina: comp ? "comp" : null, topico: comp, dificuldade: 2,
      alternativas: JSON.parse(qp.alternativas), correta: qp.correta,
      explicacao: `Gabarito oficial: ${letra} (${qp.prova.orgao}${qp.prova.ano ? ` ${qp.prova.ano}` : ""}, ${qp.prova.banca}).`,
      chaveDedup: { questaoProvaId: qp.id },
      perfil,
    };
  }

  if (body.data.escolhida >= q.alternativas.length) return NextResponse.json({ erro: "alternativa inválida" }, { status: 400 });
  const acertou = body.data.escolhida === q.correta;
  const agora = new Date();
  const inicioDia = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));

  const resultado = await prisma.$transaction(async (tx) => {
    const anteriores = await tx.resposta.findMany({ where: { userId, ...q.chaveDedup }, select: { createdAt: true } });
    const repetidaHoje = anteriores.some((r) => r.createdAt >= inicioDia);
    const primeira = anteriores.length === 0;

    // Sequência de acertos consecutivos mais recentes neste cargo.
    const ult = await tx.resposta.findMany({
      where: { userId, OR: [{ cargoId: q.cargoId }, { questao: { cargoId: q.cargoId } }] },
      orderBy: { createdAt: "desc" }, take: 20, select: { acertou: true },
    });
    let seq = acertou ? 1 : 0;
    if (acertou) for (const r of ult) { if (r.acertou) seq++; else break; }

    const xp = calcularXp({ acertou, dificuldade: q.dificuldade, sequenciaAcertos: seq, repetidaHoje });
    await tx.resposta.create({
      data: { userId, ...q.chaveDedup, cargoId: q.cargoId, escolhida: body.data.escolhida, acertou, xpGanho: xp },
    });

    // Domínio do tópico só considera a primeira resposta a cada questão (respostas únicas).
    let dominio: number | null = null;
    if (q.disciplina && q.topico) {
      const chave = { userId, cargoId: q.cargoId, disciplina: q.disciplina, topico: q.topico };
      const pt = await tx.progressoTopico.findUnique({ where: { userId_cargoId_disciplina_topico: chave } });
      let recentes: number[] = pt ? JSON.parse(pt.recentes) : [];
      let tentativas = pt?.tentativas ?? 0;
      if (primeira) {
        recentes = atualizarRecentes(recentes, acertou);
        tentativas += 1;
      }
      dominio = calcularDominio(recentes, tentativas);
      await tx.progressoTopico.upsert({
        where: { userId_cargoId_disciplina_topico: chave },
        create: { ...chave, tentativas, recentes: JSON.stringify(recentes), dominio },
        update: { tentativas, recentes: JSON.stringify(recentes), dominio },
      });
    }

    // Proficiência: questões de prova usam o perfil de competências do cargo; as antigas, os tópicos do edital.
    let proficiencia: number;
    const progs = await tx.progressoTopico.findMany({ where: { userId, cargoId: q.cargoId } });
    if (q.perfil) {
      const dom = new Map(progs.filter((p) => p.disciplina === "comp").map((p) => [p.topico, p.dominio]));
      proficiencia = dominioPonderado(q.perfil, dom);
    } else {
      const temas = await tx.tema.findMany({ where: { cargoId: q.cargoId } });
      const total = temas.flatMap((t) => (JSON.parse(t.topicos) as string[]).map((tp) => `${t.disciplina}|${tp}`));
      const mapa = new Map(progs.map((p) => [`${p.disciplina}|${p.topico}`, p.dominio]));
      proficiencia = calcularProficiencia(total.map((k) => mapa.get(k) ?? 0));
    }

    const pc = await tx.progressoCargo.upsert({
      where: { userId_cargoId: { userId, cargoId: q.cargoId } },
      create: { userId, cargoId: q.cargoId, xp, proficiencia },
      update: { xp: { increment: xp }, proficiencia },
    });

    // XP geral = soma dos XPs de todos os cargos estudados.
    const soma = await tx.progressoCargo.aggregate({ where: { userId }, _sum: { xp: true } });
    const xpTotal = soma._sum.xp ?? 0;
    const perfil = await tx.perfil.upsert({ where: { userId }, create: { userId }, update: {} });
    const streakDias = atualizarStreak(perfil.streakDias, perfil.ultimoEstudoEm, agora);
    const nivel = calcularNivel(xpTotal);
    await tx.perfil.update({ where: { userId }, data: { xpTotal, nivel, streakDias, ultimoEstudoEm: agora } });

    return { xpGanho: xp, xpCargo: pc.xp, proficiencia, xpTotal, nivel, streakDias, dominioTopico: dominio };
  });

  return NextResponse.json({ acertou, correta: q.correta, explicacao: q.explicacao, ...resultado });
}
