import { describe, expect, it } from "vitest";
import * as ts from "../src/lib/gamificacao";
import * as demo from "../docs/gamificacao.js";

describe("demo estática usa as mesmas regras de gamificação", () => {
  it("XP", () => {
    for (const acertou of [true, false]) for (const dificuldade of [1, 2, 3]) for (const sequenciaAcertos of [0, 1, 5, 10]) for (const repetidaHoje of [true, false]) {
      const o = { acertou, dificuldade, sequenciaAcertos, repetidaHoje };
      expect(demo.calcularXp(o)).toBe(ts.calcularXp(o));
    }
  });
  it("domínio, proficiência e nível", () => {
    for (const rec of [[], [1], [1, 0, 1], [1, 1, 1, 0, 1, 1, 0]]) for (const dist of [0, 1, 3, 6]) {
      expect(demo.calcularDominio(rec, dist)).toBeCloseTo(ts.calcularDominio(rec, dist), 10);
    }
    expect(demo.calcularProficiencia([0.5, 1, 0])).toBe(ts.calcularProficiencia([0.5, 1, 0]));
    for (const xp of [0, 99, 100, 400, 1234]) expect(demo.calcularNivel(xp)).toBe(ts.calcularNivel(xp));
    expect(demo.atualizarRecentes([1, 0, 1, 1, 0], true)).toEqual(ts.atualizarRecentes([1, 0, 1, 1, 0], true));
  });
});
