import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { aplicarGabarito, parseGabarito } from "../src/lib/provas/extrair";
import { extrairProvas } from "../src/lib/provas/cebraspe";
import { cargoCompativel, chaveOrgao, LIMIAR_CORRELATA, melhorTema, orgaoCasa } from "../src/lib/provas/casar";

describe("gabarito Cebraspe", () => {
  const gab = parseGabarito(readFileSync("tests/fixtures/cebraspe-gabarito.txt", "utf8"));
  it("lê a tabela número/letra, inclusive anuladas (X)", () => {
    expect(gab.size).toBeGreaterThanOrEqual(80);
    expect(gab.get(61)).toBe("E");
    expect(gab.get(62)).toBe("C");
    expect(gab.get(109)).toBe("X");
  });
  it("aplica o gabarito a itens certo/errado e múltipla escolha", () => {
    expect(aplicarGabarito({ numero: 61, alternativas: [] }, gab)).toMatchObject({ tipo: "certo_errado", correta: 1, anulada: false });
    expect(aplicarGabarito({ numero: 62, alternativas: [] }, gab)).toMatchObject({ correta: 0 });
    expect(aplicarGabarito({ numero: 109, alternativas: [] }, gab)).toMatchObject({ anulada: true, correta: null });
    expect(aplicarGabarito({ numero: 9999, alternativas: [] }, gab)).toBeNull();
    const m = new Map([[1, "C"], [2, "X"]]);
    expect(aplicarGabarito({ numero: 1, alternativas: ["a", "b", "c", "d", "e"] }, new Map([[1, "C"]]))).toMatchObject({ tipo: "multipla", correta: 2 });
    expect(m.size).toBe(2);
  });
});

describe("provas do evento Cebraspe", () => {
  const ev = JSON.parse(readFileSync("tests/fixtures/cebraspe-evento-abin.json", "utf8"));
  const provas = extrairProvas("ABIN_17", ev);
  it("pareia prova objetiva com gabarito definitivo e ignora discursiva/adaptada", () => {
    expect(provas.length).toBeGreaterThan(5);
    const p = provas.find((x) => x.provaUrl.endsWith("378_ABIN_014_01.PDF"))!;
    expect(p.gabaritoUrl).toContain("GAB_DEFINITIVO_378_ABIN_014_01.PDF");
    expect(provas.some((x) => /DISC|ADAPTADA|SUPER/i.test(x.provaUrl))).toBe(false);
    expect(provas.every((x) => x.provaUrl.startsWith("https://cdn.cebraspe.org.br/concursos/ABIN_17/arquivos/"))).toBe(true);
  });
  it("conhecimentos gerais não têm área; usa nome do cargo do evento", () => {
    const geral = provas.find((x) => x.provaUrl.includes("CB1_01"))!;
    expect(geral.area).toBeNull();
    expect(provas.find((x) => x.provaUrl.endsWith("378_ABIN_014_01.PDF"))!.cargoNome).toMatch(/ÁREA 10/i);
  });
});

describe("casamento órgão/cargo", () => {
  it("chave do órgão ignora ano e símbolos", () => {
    expect(chaveOrgao("ABIN 2017")).toBe("abin");
    expect(chaveOrgao("TJ_CE_18_JUIZ")).toBe("tj ce juiz");
  });
  it("órgão casa por palavras inteiras", () => {
    expect(orgaoCasa("ABIN - Agência Brasileira de Inteligência concurso 2026", "abin")).toBe(true);
    expect(orgaoCasa("Prefeitura de Cabine - SP", "abin")).toBe(false);
    expect(orgaoCasa("Tribunal de Justiça do Ceará TJ-CE", "tj ce")).toBe(true);
    expect(orgaoCasa("TJ-SP", "tj ce")).toBe(false);
  });
  it("cargo compatível: geral serve a todos; área precisa bater", () => {
    expect(cargoCompativel({ area: null, cargoNome: "x" }, { area: "tecnologia", nome: "Analista" })).toBe(true);
    expect(cargoCompativel({ area: "juridica", cargoNome: "Advogado" }, { area: "tecnologia", nome: "Analista de Sistemas" })).toBe(false);
    expect(cargoCompativel({ area: "tecnologia", cargoNome: "Analista de TI" }, { area: "tecnologia", nome: "Outro" })).toBe(true);
  });
});

describe("questões correlatas ao edital", () => {
  const temas = [
    { disciplina: "Banco de Dados", topicos: ["Modelagem relacional e normalização", "Linguagem SQL"] },
    { disciplina: "Língua Portuguesa", topicos: ["Concordância verbal", "Pontuação"] },
  ];
  it("liga questão de outra prova ao tópico do edital", () => {
    const m = melhorTema({ disciplina: "Banco de Dados", topico: "SQL", enunciado: "Considere a linguagem SQL e a cláusula JOIN" }, temas)!;
    expect(m.topico).toBe("Linguagem SQL");
    expect(m.pontos).toBeGreaterThanOrEqual(LIMIAR_CORRELATA);
  });
  it("matéria sem relação fica abaixo do limiar", () => {
    const m = melhorTema({ disciplina: "Direito Penal", topico: "Crimes contra a vida", enunciado: "Homicídio doloso qualificado" }, temas);
    expect(m === null || m.pontos < LIMIAR_CORRELATA).toBe(true);
  });
});

describe("cargos de um mesmo órgão", () => {
  it("palavras genéricas (analista, judiciário) não bastam para compatibilizar", () => {
    const prova = { area: "saude", cargoNome: "ANALISTA JUDICIÁRIO – ÁREA: APOIO ESPECIALIZADO – ESPECIALIDADE: ENFERMAGEM" };
    expect(cargoCompativel(prova, { area: "administrativa", nome: "Analista Judiciário - Área Administrativa" })).toBe(false);
    expect(cargoCompativel(prova, { area: "saude", nome: "Enfermeiro" })).toBe(true);
  });
});

import { distribuir, normalizarPesos, selecionar, contarItens } from "../src/lib/prova-cargo";
import { eCargoTI } from "../src/lib/provas/casar";

describe("prova por competências", () => {
  const perfil = normalizarPesos(new Map([["ti.bd.sql", 5], ["ti.redes.protocolos", 3], ["ti.seg.cripto", 2]]));
  it("normaliza os pesos e ordena do maior para o menor", () => {
    expect(perfil.map((p) => p.competencia)).toEqual(["ti.bd.sql", "ti.redes.protocolos", "ti.seg.cripto"]);
    expect(perfil.reduce((s, p) => s + p.peso, 0)).toBeCloseTo(1);
  });
  it("método do maior resto soma exatamente n", () => {
    for (const n of [7, 10, 20, 33]) {
      const q = distribuir(perfil, n);
      expect([...q.values()].reduce((a, b) => a + b, 0)).toBe(n);
    }
    expect(distribuir(perfil, 10).get("ti.bd.sql")).toBe(5);
  });
  const cand = (id: string, competencia: string, hash: string | null, extra = {}) => ({ id, competencia, hash, banca: "cebraspe", ano: 2020, mesmoOrgao: false, ...extra });
  const pool = [
    ...Array.from({ length: 10 }, (_, i) => cand(`s${i}`, "ti.bd.sql", `sql${i}`)),
    ...Array.from({ length: 10 }, (_, i) => cand(`r${i}`, "ti.redes.protocolos", `red${i}`)),
    ...Array.from({ length: 1 }, (_, i) => cand(`c${i}`, "ti.seg.cripto", `cri${i}`)),
  ];
  it("segue as cotas, redistribui o que falta e reporta a cobertura", () => {
    const { escolhidas, cobertura } = selecionar(pool, perfil, 10);
    expect(escolhidas).toHaveLength(10);
    expect(new Set(escolhidas.map((e) => e.id)).size).toBe(10);
    const cripto = cobertura.find((c) => c.competencia === "ti.seg.cripto")!;
    expect(cripto.pedidas).toBe(2);
    expect(cripto.entregues).toBe(1); // só havia 1 questão: o resto foi para as demais
  });
  it("nunca repete o mesmo enunciado (hash)", () => {
    const dup = [cand("a", "ti.bd.sql", "igual"), cand("b", "ti.bd.sql", "igual"), cand("c", "ti.bd.sql", "outro")];
    const { escolhidas } = selecionar(dup, normalizarPesos(new Map([["ti.bd.sql", 1]])), 3);
    expect(escolhidas.map((e) => e.hash).sort()).toEqual(["igual", "outro"]);
  });
  it("prefere o mesmo órgão", () => {
    const c = [cand("x", "ti.bd.sql", "h1"), cand("y", "ti.bd.sql", "h2", { mesmoOrgao: true })];
    expect(selecionar(c, normalizarPesos(new Map([["ti.bd.sql", 1]])), 1).escolhidas[0].id).toBe("y");
  });
  it("converte itens de edital em contagens por competência", () => {
    const cont = contarItens([{ disciplina: "Banco de Dados", topicos: ["Comandos SQL", "Normalização", "Gerência de Transações"] }, { disciplina: "Redes", topicos: ["Protocolos DHCP e DNS"] }]);
    expect(cont.get("ti.bd.sql")).toBeGreaterThanOrEqual(1);
    expect(cont.get("ti.redes.protocolos")).toBe(1);
  });
});

describe("cargos de TI", () => {
  it("reconhece cargos de TI e rejeita os demais", () => {
    expect(eCargoTI("ANALISTA JUDICIÁRIO – ÁREA: APOIO ESPECIALIZADO – ESPECIALIDADE: TECNOLOGIA DA INFORMAÇÃO")).toBe(true);
    expect(eCargoTI("Analista de Sistemas")).toBe(true);
    expect(eCargoTI("TECNÓLOGO – ÁREA: SISTEMAS DE TELECOMUNICAÇÕES")).toBe(true);
    expect(eCargoTI("Analista Judiciário – Área: Administrativa")).toBe(false);
    expect(eCargoTI("Enfermeiro")).toBe(false);
  });
});
