import "dotenv/config";
import { prisma } from "../src/lib/db";
import { competenciaPorId, melhorCompetencia, nomeGrupo } from "../src/lib/taxonomia/ti";

// Uso: npm run provas:reclassificar
// Reaplica a taxonomia às questões já gravadas (sem baixar PDFs) e refina a marca "TI" das provas:
// uma prova de cargo de TI só conta como TI se boa parte das questões cair em competências de TI.
async function main() {
  const questoes = await prisma.questaoProva.findMany({ select: { id: true, enunciado: true, alternativas: true, competencia: true } });
  let mudou = 0;
  for (const q of questoes) {
    const alt = (JSON.parse(q.alternativas) as string[]).join(" ");
    const c = melhorCompetencia(q.enunciado, alt);
    if (c === q.competencia) continue;
    const no = c ? competenciaPorId(c) : undefined;
    await prisma.questaoProva.update({
      where: { id: q.id },
      data: { competencia: c, disciplina: c ? nomeGrupo(c) : "Não classificada", topico: no?.nome ?? "Não classificada" },
    });
    mudou++;
  }
  console.log(`questões reclassificadas: ${mudou}/${questoes.length}`);

  const provas = await prisma.prova.findMany({ where: { status: "ok" }, select: { id: true, ti: true, cargoNome: true } });
  let removidas = 0;
  for (const p of provas) {
    const qs = await prisma.questaoProva.findMany({ where: { provaId: p.id }, select: { competencia: true } });
    if (!qs.length) continue;
    const tecnicas = qs.filter((q) => q.competencia && !q.competencia.startsWith("ti.geral.")).length;
    const geral = /conhecimentos (gerais|b[aá]sicos)/i.test(p.cargoNome);
    // Prova específica sem quase nada de TI não é prova de TI (ex.: cargo de engenharia de telecomunicações).
    if (!geral && p.ti && tecnicas / qs.length < 0.25) {
      await prisma.prova.update({ where: { id: p.id }, data: { ti: false } });
      removidas++;
    }
  }
  console.log(`provas desmarcadas como TI por baixa aderência: ${removidas}`);

  const ti = await prisma.questaoProva.count({ where: { prova: { ti: true } } });
  const cl = await prisma.questaoProva.count({ where: { prova: { ti: true }, competencia: { not: null } } });
  const tec = await prisma.questaoProva.count({ where: { prova: { ti: true }, competencia: { startsWith: "ti." }, NOT: { competencia: { startsWith: "ti.geral." } } } });
  console.log(`questões de provas de TI: ${ti} · classificadas: ${cl} (${((100 * cl) / Math.max(1, ti)).toFixed(1)}%) · de competências técnicas de TI: ${tec}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
