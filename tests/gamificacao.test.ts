import { describe, expect, it } from "vitest";
import {
  atualizarRecentes,
  atualizarStreak,
  calcularDominio,
  calcularNivel,
  calcularProficiencia,
  calcularXp,
} from "../src/lib/gamificacao";
import { classificarArea } from "../src/lib/areas";

describe("XP", () => {
  it("acerto vale por dificuldade, erro vale 2, repetição vale 0", () => {
    expect(calcularXp({ acertou: true, dificuldade: 1, sequenciaAcertos: 1, repetidaHoje: false })).toBe(10);
    expect(calcularXp({ acertou: true, dificuldade: 2, sequenciaAcertos: 1, repetidaHoje: false })).toBe(15);
    expect(calcularXp({ acertou: true, dificuldade: 3, sequenciaAcertos: 1, repetidaHoje: false })).toBe(20);
    expect(calcularXp({ acertou: false, dificuldade: 3, sequenciaAcertos: 0, repetidaHoje: false })).toBe(2);
    expect(calcularXp({ acertou: true, dificuldade: 1, sequenciaAcertos: 1, repetidaHoje: true })).toBe(0);
  });
  it("bônus a cada 5 acertos seguidos", () => {
    expect(calcularXp({ acertou: true, dificuldade: 1, sequenciaAcertos: 5, repetidaHoje: false })).toBe(15);
  });
});

describe("domínio e proficiência", () => {
  it("exige questões distintas mínimas", () => {
    expect(calcularDominio([1], 1)).toBeCloseTo(1 / 3);
    expect(calcularDominio([1, 1, 1], 3)).toBe(1);
  });
  it("janela das últimas 5", () => {
    let r: number[] = [];
    for (let i = 0; i < 8; i++) r = atualizarRecentes(r, true);
    expect(r).toHaveLength(5);
  });
  it("100% só com todos os tópicos no máximo", () => {
    expect(calcularProficiencia([1, 1, 1])).toBe(100);
    expect(calcularProficiencia([1, 1, 0])).toBeLessThan(100);
    expect(calcularProficiencia([])).toBe(0);
  });
  it("nível e streak", () => {
    expect(calcularNivel(0)).toBe(1);
    expect(calcularNivel(400)).toBe(3);
    const d = new Date("2026-10-28T12:00:00Z");
    expect(atualizarStreak(3, new Date("2026-10-27T12:00:00Z"), d)).toBe(4);
    expect(atualizarStreak(3, new Date("2026-10-28T01:00:00Z"), d)).toBe(3);
    expect(atualizarStreak(3, new Date("2026-10-20T12:00:00Z"), d)).toBe(1);
  });
});

describe("áreas", () => {
  it("classifica TI e outras", () => {
    expect(classificarArea("Analista de Sistemas")).toBe("tecnologia");
    expect(classificarArea("Auditor Federal de Finanças e Controle - Especialidade: Tecnologia da Informação")).toBe("tecnologia");
    expect(classificarArea("Professor de Matemática")).toBe("educacao");
    expect(classificarArea("Xyz")).toBeNull();
  });
});
