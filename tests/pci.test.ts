import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseDetalhe, parseListagem } from "../src/lib/sources/pci";

const lista = readFileSync("tests/fixtures/pci-listagem.html", "utf8");
const detalhe = readFileSync("tests/fixtures/pci-detalhe.html", "utf8");

describe("PCI parser", () => {
  const itens = parseListagem(lista);

  it("lê itens da listagem com UF, vagas, salário e escolaridade", () => {
    expect(itens.length).toBeGreaterThan(10);
    const camara = itens.find((i) => i.orgao === "Câmara dos Deputados")!;
    expect(camara.uf).toBe("BR");
    expect(camara.vagas).toBe(184);
    expect(camara.salario).toBe("R$ 32.070,88");
    expect(camara.cargos).toContain("Engenheiro");
    expect(camara.escolaridade).toBe("Superior");
    expect(camara.inscricoesAte?.getUTCMonth()).toBe(10);
  });

  it("atribui UF dos blocos estaduais e deixa 'Vários Cargos' vazio", () => {
    const sp = itens.find((i) => i.uf === "SP");
    expect(sp).toBeTruthy();
    expect(itens.some((i) => i.cargos.length === 0)).toBe(true);
  });

  it("lê cargos, banca e site oficial na página de detalhe", () => {
    const d = parseDetalhe(detalhe);
    expect(d.cargos.some((c) => c.nome.includes("Tecnologia da Informação") && c.vagas === 10)).toBe(true);
    expect(d.banca).toBe("cebraspe");
    expect(d.linksOficiais).toContain("https://www.cebraspe.org.br/concursos/cgu_26_affc");
  });
});
