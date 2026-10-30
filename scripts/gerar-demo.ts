import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "../src/lib/db";
import { COMPETENCIAS, GRUPOS, eGeral } from "../src/lib/taxonomia/ti";
import { AREAS } from "../src/lib/areas";

// Uso: npm run demo:gerar
// Gera docs/data/demo.json para a demo estática do GitHub Pages.
// Exporta SOMENTE concursos abertos, a taxonomia e uma amostra pequena de questões. Nunca usuários, senhas ou respostas.
const MAX_CONCURSOS = 60;
const MAX_QUESTOES = 500;
const POR_COMPETENCIA = 25;

async function main() {
  const concursos = await prisma.concurso.findMany({
    where: { status: "aberto" },
    include: { cargos: true },
    orderBy: { createdAt: "desc" },
  });
  // Concursos com cargos de tecnologia primeiro; completa com os demais até o limite.
  const ti = concursos.filter((c) => c.cargos.some((g) => g.area === "tecnologia"));
  const resto = concursos.filter((c) => !ti.includes(c));
  const escolhidos = [...ti, ...resto].slice(0, MAX_CONCURSOS);

  const questoes = await prisma.questaoProva.findMany({
    where: {
      prova: { status: "ok", ti: true }, competencia: { startsWith: "ti." }, anulada: false,
      correta: { not: null }, dependeDeApoio: false,
    },
    select: { id: true, competencia: true, enunciado: true, alternativas: true, correta: true, prova: { select: { orgao: true, ano: true, banca: true } } },
    orderBy: { id: "asc" },
  });

  // Amostra balanceada: no máximo POR_COMPETENCIA por competência técnica (as gerais entram só se sobrar espaço).
  const porComp = new Map<string, typeof questoes>();
  for (const q of questoes) {
    if (!q.competencia) continue;
    porComp.set(q.competencia, [...(porComp.get(q.competencia) ?? []), q]);
  }
  const amostra: typeof questoes = [];
  const comps = [...porComp.keys()].sort((a, b) => Number(eGeral(a)) - Number(eGeral(b)));
  for (const c of comps) {
    const lista = porComp.get(c)!;
    // espaçamento regular para variar bancas/anos em vez de pegar só as primeiras
    const passo = Math.max(1, Math.floor(lista.length / POR_COMPETENCIA));
    for (let i = 0; i < lista.length && amostra.filter((x) => x.competencia === c).length < POR_COMPETENCIA && amostra.length < MAX_QUESTOES; i += passo) amostra.push(lista[i]);
  }

  const contagem = new Map<string, number>();
  for (const q of amostra) contagem.set(q.competencia!, (contagem.get(q.competencia!) ?? 0) + 1);

  const demo = {
    gerado: new Date().toISOString().slice(0, 10),
    areas: AREAS.map((a) => ({ id: a.id, nome: a.nome })),
    grupos: GRUPOS,
    competencias: COMPETENCIAS.filter((c) => contagem.has(c.id)).map((c) => ({ id: c.id, nome: c.nome, grupo: c.grupo, n: contagem.get(c.id)! })),
    concursos: escolhidos.map((c) => ({
      id: c.id, orgao: c.orgao, titulo: c.titulo, uf: c.uf, banca: c.banca, inscricoesAte: c.inscricoesAte?.toISOString().slice(0, 10) ?? null,
      fonte: c.fonteUrl,
      cargos: c.cargos.slice(0, 8).map((g) => ({ id: g.id, nome: g.nome, area: g.area, vagas: g.vagas, salario: g.salario })),
    })),
    questoes: amostra.map((q) => ({
      id: q.id, c: q.competencia, e: q.enunciado, a: JSON.parse(q.alternativas) as string[], r: q.correta,
      o: `${q.prova.orgao}${q.prova.ano ? ` ${q.prova.ano}` : ""} · ${q.prova.banca}`,
    })),
  };
  mkdirSync("docs/data", { recursive: true });
  const json = JSON.stringify(demo);
  writeFileSync("docs/data/demo.json", json);
  console.log(`concursos: ${demo.concursos.length} (${ti.length} com TI) · questões: ${demo.questoes.length} · competências: ${demo.competencias.length} · ${(json.length / 1024).toFixed(0)} KB`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
