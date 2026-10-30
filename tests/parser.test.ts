import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseProva } from "../src/lib/provas/parser/prova";
import { dependeDeApoio } from "../src/lib/provas/parser/limpar";
import { escolherCargo, parseConteudoEdital, separarItens } from "../src/lib/provas/parser/edital";
import { parseGabarito } from "../src/lib/provas/extrair";

describe("parser de prova (múltipla escolha)", () => {
  const r = parseProva(readFileSync("tests/fixtures/prova-mc-trt8-ti.txt", "utf8"));
  it("detecta o layout e as 40 questões (21 a 60) sem descartar nenhuma", () => {
    expect(r.layout).toBe("multipla");
    expect(r.questoes).toHaveLength(40);
    expect(r.descartadas).toEqual([]);
    expect(r.questoes[0].numero).toBe(21);
    expect(r.questoes.at(-1)!.numero).toBe(60);
  });
  it("separa enunciado e 5 alternativas sem as letras", () => {
    const q = r.questoes.find((x) => x.numero === 22)!;
    expect(q.alternativas).toHaveLength(5);
    expect(q.alternativas[4]).toBe("comunicação stateless.");
    expect(q.enunciado).toContain("API RESTful");
    expect(q.enunciado).not.toMatch(/^A /);
  });
  it("não confunde 'A ...' do enunciado com a alternativa A", () => {
    expect(r.questoes.every((q) => q.alternativas.length >= 4 && q.alternativas.every((a) => a.length > 0))).toBe(true);
  });
  it("não deixa cabeçalho de página dentro das questões", () => {
    expect(r.questoes.some((q) => /CEBRASPE – TRT/.test(q.enunciado + q.alternativas.join(" ")))).toBe(false);
  });
});

describe("parser de prova (certo/errado)", () => {
  const r = parseProva(readFileSync("tests/fixtures/prova-ce-abin.txt", "utf8"));
  const gab = parseGabarito(readFileSync("tests/fixtures/cebraspe-gabarito.txt", "utf8"));
  it("lê os itens numerados e bate com os números do gabarito", () => {
    expect(r.layout).toBe("certo_errado");
    const nums = r.questoes.map((q) => q.numero);
    expect(nums.length).toBe(90); // itens 61 a 150 do PDF
    expect(nums.every((n) => gab.has(n))).toBe(true);
    expect(nums[0]).toBe(61);
    expect(nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)).toBe(true); // sem buracos
  });
  it("prefixa a frase introdutória nos itens do bloco", () => {
    const q66 = r.questoes.find((q) => q.numero === 66)!;
    expect(q66.enunciado).toMatch(/julgue os itens/i);
    expect(q66.enunciado).toContain("direito à informação");
    const q65 = r.questoes.find((q) => q.numero === 65)!;
    expect(q65.enunciado).not.toMatch(/acesso a documentos/);
  });
});

describe("dependência de figura/texto", () => {
  it("marca figuras e textos-base, mas não código inline", () => {
    expect(dependeDeApoio("Considerando a figura abaixo, é correto afirmar que")).toBe(true);
    expect(dependeDeApoio("De acordo com o texto, o autor")).toBe(true);
    expect(dependeDeApoio("Texto CG1A1-I blá")).toBe(true);
    expect(dependeDeApoio("No comando SQL apresentado a seguir, CREATE TABLE t (id int);")).toBe(false);
  });
});

describe("parser de edital (conteúdo programático)", () => {
  const ed = parseConteudoEdital(readFileSync("tests/fixtures/edital-trt8-objetos.txt", "utf8"));
  const ti = ed.cargos.find((c) => c.numeros.includes(15))!;
  it("acha os conhecimentos gerais e o cargo 15 (TI)", () => {
    expect(ed.gerais.map((d) => d.nome)).toContain("LÍNGUA PORTUGUESA");
    expect(ti).toBeTruthy();
    expect(ti.nome).toMatch(/TECNOLOGIA DA INFORMAÇÃO/);
  });
  it("separa as disciplinas de TI e seus itens", () => {
    const nomes = ti.disciplinas.map((d) => d.nome);
    expect(nomes).toEqual(expect.arrayContaining(["BANCO DE DADOS", "VIRTUALIZAÇÃO", "COMPUTAÇÃO EM NUVEM", "SISTEMAS OPERACIONAIS"]));
    const bd = ti.disciplinas.find((d) => d.nome === "BANCO DE DADOS")!;
    expect(bd.itens.join(" | ")).toMatch(/Comandos SQL/);
    expect(bd.itens.length).toBeGreaterThan(6);
    expect(ti.disciplinas.length).toBeGreaterThanOrEqual(8);
  });
  it("itens vêm sem numeração", () => {
    expect(separarItens("1 Docker. 2 Jenkins. 2.1 Pipelines. 3 Maven.")).toEqual(["Docker", "Jenkins", "Pipelines", "Maven"]);
  });
  it("casa o nome do cargo do concurso com o bloco do edital", () => {
    const achado = escolherCargo("Analista Judiciário - Área: Apoio Especializado - Especialidade: Tecnologia da Informação", ed.cargos);
    expect(achado?.numeros).toContain(15);
    expect(escolherCargo("Cozinheiro", ed.cargos)).toBeNull();
  });
});

describe("variações de layout do Cebraspe", () => {
  it("gabarito com enchimento '0' e espaçamento irregular (FUB)", () => {
    const gab = parseGabarito(readFileSync("tests/fixtures/gabarito-fub.txt", "utf8"));
    expect(gab.size).toBe(50);
    expect(gab.get(1)).toBe("E");
    expect(gab.get(11)).toBe("X");
    expect(gab.get(50)).toBe("E");
  });
  it("itens certo/errado numerados só com espaço (INFRA)", () => {
    const r = parseProva(readFileSync("tests/fixtures/prova-ce-infra.txt", "utf8"));
    const gab = parseGabarito(readFileSync("tests/fixtures/gabarito-infra.txt", "utf8"));
    expect(r.layout).toBe("certo_errado");
    expect(r.questoes.length).toBeGreaterThanOrEqual(30);
    expect(r.questoes.every((q) => gab.has(q.numero))).toBe(true);
    const q43 = r.questoes.find((q) => q.numero === 43)!;
    expect(q43.enunciado).toMatch(/Kubernetes/);
    expect(q43.enunciado).toMatch(/julgue os itens/i);
    expect(r.questoes.find((q) => q.numero === 42)!.enunciado).not.toMatch(/Kubernetes/);
  });
});

describe("layout 'QUESTÃO N <código>' (TCE/MG 2025)", () => {
  it("lê as questões de múltipla escolha com cabeçalho em caixa alta", () => {
    const r = parseProva(readFileSync("tests/fixtures/prova-mc-tce-mg.txt", "utf8"));
    expect(r.layout).toBe("multipla");
    expect(r.questoes.length).toBeGreaterThanOrEqual(40);
    expect(r.questoes[0].numero).toBe(31);
    expect(r.questoes[0].alternativas).toHaveLength(5);
    expect(r.questoes[0].enunciado).toMatch(/CMMI-DEV/);
  });
});
