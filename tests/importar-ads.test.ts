import { describe, expect, it } from "vitest";
import { agruparProvas, converterRegistro, type RegistroAds } from "../src/lib/provas/importar-ads";

const base: RegistroAds = {
  id: "p1#001", prova_id: "p1", banca: "FCC", ano: 2013, orgao: "DPE/SP", cargo: "Analista de Sistemas", numero: 1,
  enunciado: "Em SQL, o comando SELECT com JOIN e GROUP BY serve para",
  alternativas: { A: "a1", B: "b1", C: "c1", D: "d1", E: "e1" },
  gabarito: "C", anulada: false, imagens: [],
};

describe("importação do provas-ads", () => {
  it("converte letra do gabarito em índice e classifica", () => {
    const q = converterRegistro(base)!;
    expect(q.correta).toBe(2);
    expect(q.alternativas).toHaveLength(5);
    expect(q.tipo).toBe("multipla");
    expect(q.competencia).toBe("ti.bd.sql");
    expect(q.dependeDeApoio).toBe(false);
  });
  it("ignora questão sem gabarito, mantém anulada", () => {
    expect(converterRegistro({ ...base, gabarito: null })).toBeNull();
    expect(converterRegistro({ ...base, gabarito: null, anulada: true })?.anulada).toBe(true);
  });
  it("questão com imagem capturada entra nos simulados", () => {
    expect(converterRegistro({ ...base, imagens: ["x.png"] })!.dependeDeApoio).toBe(false);
  });
  it("agrupa por prova e preenche metadados", () => {
    const [p] = agruparProvas([base, { ...base, id: "p1#002", numero: 2, gabarito: null }]);
    expect(p.questoes).toHaveLength(1);
    expect(p.semGabarito).toBe(1);
    expect(p.banca).toBe("fcc");
    expect(p.ti).toBe(true);
  });
});

import { chaveOrgao, orgaoCasa } from "../src/lib/provas/casar";

describe("órgão da prova (sigla do PCI) × nome do concurso", () => {
  const casa = (concurso: string, orgao: string) => orgaoCasa(concurso, chaveOrgao(orgao));
  it("expande siglas estaduais", () => {
    expect(casa("TJSP - Tribunal de Justiça do Estado de São Paulo", "TJ/SP")).toBe(true);
    expect(casa("Defensoria Pública do Estado de São Paulo", "DPE/SP")).toBe(true);
    expect(casa("MPE ES - Ministério Público do Espírito Santo", "MPE/ES")).toBe(true);
  });
  it("não confunde estados", () => {
    expect(casa("Defensoria Pública do Estado de São Paulo", "DPE/MT")).toBe(false);
    expect(casa("Defensoria Pública do Estado de Mato Grosso do Sul", "DPE/MT")).toBe(false);
    expect(casa("Defensoria Pública do Estado de Mato Grosso", "DPE/MT")).toBe(true);
  });
  it("reconhece órgãos federais e prefeituras pelo nome por extenso", () => {
    expect(casa("Instituto Brasileiro de Geografia e Estatística", "IBGE")).toBe(true);
    expect(casa("Prefeitura de Boa Vista - RR", "Pref. Boa Vista/RR - SMAG")).toBe(true);
    expect(casa("Prefeitura de Nova Boa Vista", "Pref. Boa Vista/RR - SMAG")).toBe(false);
  });
});

describe("texto de apoio e figuras", () => {
  const regBase = { id: "p#1", prova_id: "p", banca: "FGV", ano: 2020, orgao: "IBGE", cargo: "Analista de Sistemas", numero: 1, enunciado: "Observe a figura a seguir. Em SQL, qual comando consulta dados?", alternativas: { A: "a", B: "b", C: "c", D: "d" }, gabarito: "A", imagens: [] as string[] };
  it("sem apoio capturado, enunciado que cita figura continua fora dos simulados", () => {
    expect(converterRegistro(regBase)!.dependeDeApoio).toBe(true);
  });
  it("com figura capturada a questão entra e guarda os caminhos", () => {
    const q = converterRegistro({ ...regBase, imagens: ["p/x.png"] })!;
    expect(q.dependeDeApoio).toBe(false);
    expect(q.imagens).toEqual(["p/x.png"]);
  });
  it("com texto de apoio guarda o texto", () => {
    const q = converterRegistro({ ...regBase, texto: "  Texto base  " })!;
    expect(q.dependeDeApoio).toBe(false);
    expect(q.textoApoio).toBe("Texto base");
  });
});
