import { buscar } from "../http";
import { areaDoCargo, chaveOrgao, eCargoTI } from "./casar";

const API = "https://apis.cebraspe.org.br/cebraspe";
const CDN = "https://cdn.cebraspe.org.br/concursos";

export type EventoResumo = { chave: string; nome: string; ano: number | null; orgaoChave: string };
export type ProvaCandidata = {
  provaUrl: string;
  gabaritoUrl: string | null;
  cargoNome: string;
  area: string | null;
  ti: boolean;
};

type Arquivo = { nomeArquivo: string; descricaoArquivo: string };
type Cargo = { idArea: string; area: string };
export type Detalhe = {
  eventoURL: string;
  arquivosEdital: Arquivo[] | null;
  arquivosGabarito: Arquivo[] | null;
  eventoCargos: Cargo[] | null;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await buscar(url, { accept: "application/json", timeoutMs: 30000 });
  return (await res.json()) as T;
}

/** Concursos encerrados (edições anteriores) publicados pelo Cebraspe. */
export async function listarEventosEncerrados(): Promise<EventoResumo[]> {
  const grupos = await getJson<{ eventos: { eventoURL: string; eventoNomeAbreviado: string; eventoAno: number | null }[] }[]>(
    `${API}/eventos/tipo/concursos/fase/encerrado`,
  );
  return grupos.flatMap((g) => g.eventos).map((e) => ({
    chave: e.eventoURL,
    nome: e.eventoNomeAbreviado,
    ano: e.eventoAno ?? null,
    orgaoChave: chaveOrgao(e.eventoNomeAbreviado),
  }));
}

export async function detalharEvento(chave: string): Promise<Detalhe> {
  return getJson<Detalhe>(`${API}/eventos/${encodeURIComponent(chave)}`);
}

export const urlArquivo = (chave: string, nome: string) => `${CDN}/${chave}/arquivos/${encodeURIComponent(nome)}`;

const stem = (nome: string) => nome.replace(/\.pdf$/i, "").toUpperCase();

/** "GABARITO DEFINITIVO – CONHECIMENTOS GERAIS" e "PROVA OBJETIVA – CONHECIMENTOS GERAIS" -> "CONHECIMENTOS GERAIS". */
const rotuloDaDescricao = (d: string) =>
  d.replace(/^(PROVA OBJETIVA|GABARITO(?:\s+\w+)?)\s*[-–—]\s*/i, "").replace(/\s+/g, " ").trim().toUpperCase();

/** Descreve o cargo da prova ("CARGO 2 - ÁREA 10") usando a lista de cargos do evento. */
function nomeDoCargo(descricao: string, cargos: Cargo[]): string {
  const m = descricao.match(/CARGOS?\s+(\d+)(?:\s*-\s*[ÁA]REAS?\s+([\d]+))?/i);
  if (m) {
    const lista = cargos.filter((c) => new RegExp(`^CARGO\\s+${m[1]}\\b`, "i").test(c.area));
    const exata = m[2] ? lista.find((c) => new RegExp(`[ÁA]REA\\s+${m[2]}\\b`, "i").test(c.area)) : undefined;
    const escolhido = exata ?? lista[0];
    if (escolhido) return escolhido.area.replace(/^CARGO\s+\d+\s*:\s*/i, "").trim();
  }
  return descricao.replace(/^PROVA OBJETIVA\s*-\s*/i, "").trim();
}

/** O evento tem algum cargo de TI? (olha a lista oficial de cargos do concurso) */
export function eventoTemTI(d: Detalhe): boolean {
  return (d.eventoCargos ?? []).some((c) => eCargoTI(c.area));
}

/** Edital de abertura do evento (de onde sai o conteúdo programático), se publicado. */
export function editalDeAbertura(d: Detalhe): string | null {
  const a = (d.arquivosEdital ?? []).find((x) => /abertura/i.test(`${x.nomeArquivo} ${x.descricaoArquivo}`) && !/retifica/i.test(x.descricaoArquivo));
  return a?.nomeArquivo ?? null;
}

/**
 * Provas objetivas do evento pareadas com seu gabarito (o nome do gabarito contém o nome da prova).
 * Descarta discursivas e versões adaptadas/superampliadas (mesmo conteúdo).
 */
export function extrairProvas(chave: string, d: Detalhe): ProvaCandidata[] {
  const arquivos = d.arquivosGabarito ?? [];
  const cargos = d.eventoCargos ?? [];
  const temTI = eventoTemTI(d);
  const provas = arquivos.filter(
    (a) => /^PROVA OBJETIVA/i.test(a.descricaoArquivo) && !/ADAPTADA|SUPERAMPLIADA|DISCURSIVA/i.test(a.descricaoArquivo + a.nomeArquivo),
  );
  const gabaritos = arquivos.filter((a) => /^GABARITO/i.test(a.descricaoArquivo) && !/ADAPTADA|SUPERAMPLIADA/i.test(a.descricaoArquivo));
  return provas.map((p) => {
    // Arquivos antigos: o nome do gabarito contém o da prova. Recentes (nome = hash): compara a descrição sem o rótulo.
    const porNome = gabaritos.filter((g) => stem(g.nomeArquivo).includes(stem(p.nomeArquivo)));
    const alvo = rotuloDaDescricao(p.descricaoArquivo);
    const candidatos = porNome.length ? porNome : gabaritos.filter((g) => rotuloDaDescricao(g.descricaoArquivo) === alvo);
    const gab = candidatos.find((g) => /DEFINITIVO/i.test(g.descricaoArquivo)) ?? candidatos[0];
    const cargoNome = nomeDoCargo(p.descricaoArquivo, cargos);
    const geral = /CONHECIMENTOS GERAIS|CONHECIMENTOS B[ÁA]SICOS/i.test(p.descricaoArquivo);
    return {
      provaUrl: urlArquivo(chave, p.nomeArquivo),
      gabaritoUrl: gab ? urlArquivo(chave, gab.nomeArquivo) : null,
      cargoNome,
      area: geral ? null : areaDoCargo(cargoNome),
      // Provas de conhecimentos gerais de um concurso que tem cargo de TI também entram: fazem parte da prova do cargo.
      ti: eCargoTI(cargoNome) || (geral && temTI),
    };
  });
}
