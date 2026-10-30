import "dotenv/config";
import { reenfileirarErros, sincronizarProvas } from "../src/lib/provas/sync";
import { prisma } from "../src/lib/db";

// Uso: npm run provas:backfill [-- --reenfileirar]
// Percorre todos os concursos do Cebraspe, grava provas/gabaritos/editais de TI e processa tudo (sem IA, sem cota).
// É retomável: pode ser interrompido e rodado de novo.
async function main() {
  if (process.argv.includes("--reenfileirar")) console.log(`erros reenfileirados: ${await reenfileirarErros()}`);
  const t0 = Date.now();
  const r = await sincronizarProvas({ maxDetalhes: 100000, maxProvas: 100000, log: (m) => console.log(m) });
  const [ok, erro, questoes] = await Promise.all([
    prisma.prova.count({ where: { status: "ok" } }),
    prisma.prova.count({ where: { status: "erro" } }),
    prisma.questaoProva.count(),
  ]);
  console.log(`\nconcluído em ${Math.round((Date.now() - t0) / 60000)} min: ${r.processadas} provas lidas, ${r.falhas} falhas, ${r.restantes} na fila`);
  console.log(`banco: ${ok} provas ok, ${erro} com erro, ${questoes} questões`);
  if (r.erros.length) console.log("erros (amostra):\n- " + r.erros.slice(0, 15).join("\n- "));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
