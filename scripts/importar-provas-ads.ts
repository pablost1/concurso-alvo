import "dotenv/config";
import { resolve } from "node:path";
import { prisma } from "../src/lib/db";
import { importarProvasAds } from "../src/lib/provas/importar-ads-db";

// Uso: npm run provas:importar-ads [-- caminho/questoes.jsonl]
// Lê as questões extraídas pelo projeto provas-ads (somente leitura) e grava em Prova/QuestaoProva.
async function main() {
  const r = await importarProvasAds(process.argv[2] ? resolve(process.argv[2]) : undefined);
  console.log(`provas lidas: ${r.lidas} · importadas: ${r.importadas} · sem questões aproveitáveis: ${r.vazias}`);
  console.log(`questões gravadas: ${r.questoes} · sem gabarito (ignoradas): ${r.semGabarito} · duplicadas (ignoradas): ${r.duplicadas} · dependem de figura/texto-base: ${r.comImagem}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
