import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseProva } from "../src/lib/provas/parser/prova";
import { classificar, melhorCompetencia } from "../src/lib/taxonomia/ti";

const qs = parseProva(readFileSync("tests/fixtures/prova-mc-trt8-ti.txt", "utf8")).questoes;
const rotulo = (n: number) => {
  const q = qs.find((x) => x.numero === n)!;
  return melhorCompetencia(q.enunciado, q.alternativas.join(" "));
};

describe("classificação de competências de TI", () => {
  it("classifica casos conhecidos", () => {
    expect(rotulo(21)).toBe("ti.seg.acesso"); // OAuth2
    expect(rotulo(24)).toBe("ti.nuvem.containers"); // Kubernetes
    expect(rotulo(23)).toBe("ti.prog.linguagens"); // Spring @Repository
    expect(melhorCompetencia("Na normalização de bancos de dados relacionais, a terceira forma normal exige")).toBe("ti.bd.modelagem");
    expect(melhorCompetencia("No protocolo TCP/IP, a camada de transporte utiliza UDP e TCP")).toMatch(/^ti\.redes\./);
  });
  it("cobre pelo menos 85% das questões reais de TI do fixture", () => {
    const classificadas = qs.filter((q) => melhorCompetencia(q.enunciado, q.alternativas.join(" ")) !== null);
    const taxa = classificadas.length / qs.length;
    const sem = qs.filter((q) => !classificadas.includes(q)).map((q) => `${q.numero}: ${q.enunciado.slice(0, 70)}`);
    expect(taxa, `sem classificação:\n${sem.join("\n")}`).toBeGreaterThanOrEqual(0.85);
  });
  it("ranking devolve pontuações ordenadas", () => {
    const r = classificar("Em SQL, o comando SELECT com JOIN e GROUP BY");
    expect(r[0].id).toBe("ti.bd.sql");
    expect(r[0].pontos).toBeGreaterThanOrEqual(r.at(-1)!.pontos);
  });
});
