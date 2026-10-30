import { describe, expect, it } from "vitest";
import { parseTabelaProvas, separarProvas, slugsDoCargo, type ProvaPci } from "../src/lib/sources/pci-provas";

const linha = (id: string, cargo: string, ano: number, orgao: string, banca: string) =>
  `<tr><td><a class="prova_download" href="/provas/download/${id}">${cargo}</a></td><td>${ano}</td><td>${orgao}</td><td>${banca}</td></tr>`;
const html = `<ul class="pagination"><li><a class="page-link" href="/provas/analista-de-sistemas/3">3</a></li></ul>
<table id="lista_provas"><tbody>
${linha("a-tj-ce-cespe-2014", "Analista de Sistemas", 2014, "TJ/CE", "CESPE")}
${linha("b-tj-ce-cespe-2019", "Analista de Sistemas", 2019, "TJ/CE", "CESPE")}
${linha("c-dpe-sp-fcc-2015", "Analista de Sistemas", 2015, "DPE/SP", "FCC")}
${linha("d-mp-es-fgv-2026", "Analista de Sistemas", 2026, "MP/ES", "FGV")}
</tbody></table>`;

describe("provas do PCI", () => {
  it("lê a tabela e a paginação", () => {
    const r = parseTabelaProvas(html);
    expect(r.ultimaPagina).toBe(3);
    expect(r.provas).toHaveLength(4);
    expect(r.provas[0]).toMatchObject({ id: "a-tj-ce-cespe-2014", ano: 2014, orgao: "TJ/CE", banca: "CESPE", url: "https://www.pciconcursos.com.br/provas/download/a-tj-ce-cespe-2014" });
  });
  it("separa este concurso x outros e ordena", () => {
    const { provas } = parseTabelaProvas(html);
    const r = separarProvas(provas as ProvaPci[], { orgao: "Tribunal de Justiça do Ceará TJ CE", titulo: "Concurso TJ CE 2026", banca: "FGV" });
    expect(r.esteConcurso.map((p) => p.ano)).toEqual([2019, 2014]);
    expect(r.outrosConcursos.map((p) => p.banca)).toEqual(["FGV", "FCC"]); // mesma banca primeiro
  });
  it("gera slugs de seção do cargo", () => {
    const s = slugsDoCargo("Analista de Desenvolvimento de Sistemas - Nível Superior");
    expect(s).toContain("analista-de-sistemas");
    expect(s[0]).toBe("analista-de-desenvolvimento-de-sistemas");
    expect(slugsDoCargo("Técnico de TI")).toContain("tecnico-de-ti");
  });
});
