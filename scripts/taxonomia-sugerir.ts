import "dotenv/config";
import { prisma } from "../src/lib/db";
import { classificar, PONTOS_MINIMOS } from "../src/lib/taxonomia/ti";

// Uso: npm run taxonomia:sugerir
// Lista os termos mais frequentes dos itens de edital e das questões de TI que a taxonomia ainda não reconhece.
const STOP = new Set(["de", "da", "do", "das", "dos", "em", "para", "por", "com", "que", "uma", "um", "nos", "nas", "sobre", "entre", "como", "ser", "sua", "seu", "ao", "aos", "pelo", "pela", "mais", "menos", "tipo", "conceitos", "fundamentos", "gerais", "basicos", "principais", "utilizacao", "uso", "caracteristicas", "ferramentas", "tecnicas", "conforme", "segundo", "seguinte", "seguintes", "afirmacao", "assinale", "opcao", "alternativa", "correta", "incorreta", "considerando", "acerca", "relacao", "respeito"]);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function contar(textos: string[]) {
  const c = new Map<string, number>();
  for (const t of textos) {
    const ps = norm(t).split(/[^a-z0-9#+.\/-]+/).filter((p) => p.length >= 3 && !STOP.has(p) && !/^\d+$/.test(p));
    const vistos = new Set<string>();
    for (let i = 0; i < ps.length; i++) {
      vistos.add(ps[i]);
      if (i + 1 < ps.length) vistos.add(`${ps[i]} ${ps[i + 1]}`);
    }
    for (const v of vistos) c.set(v, (c.get(v) ?? 0) + 1);
  }
  return [...c.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 60);
}

async function main() {
  const itens = (await prisma.conteudoEdital.findMany()).flatMap((r) => (JSON.parse(r.itens) as string[]).map((i) => ({ i, d: r.disciplina })));
  const semItem = itens.filter(({ i }) => (classificar(i)[0]?.pontos ?? 0) < PONTOS_MINIMOS).map((x) => x.i);
  console.log(`itens de edital sem classificação: ${semItem.length}/${itens.length}`);
  console.log(contar(semItem).map(([t, n]) => `${n}\t${t}`).join("\n"));

  const sem = await prisma.questaoProva.findMany({ where: { competencia: null, prova: { ti: true } }, select: { enunciado: true }, take: 3000 });
  console.log(`\nquestões de TI sem competência: ${sem.length}`);
  console.log(contar(sem.map((q) => q.enunciado)).map(([t, n]) => `${n}\t${t}`).join("\n"));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
