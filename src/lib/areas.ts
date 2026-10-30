export const AREAS = [
  { id: "tecnologia", nome: "Tecnologia / Programação", palavras: ["tecnologia da informa", "analista de sistemas", "desenvolvedor", "programador", "suporte t", "redes de comput", "banco de dados", "seguran[cç]a da informa", "ciência de dados", "cientista de dados", "analista de ti", "técnico em inform", "informática", "ti ", "devops", "engenheiro de software", "infraestrutura de ti", "computa", "sistemas de informa", "analista de suporte", "programa[cç]ao"] },
  { id: "saude", nome: "Saúde", palavras: ["médic", "enfermeir", "técnico de enfermagem", "farmac", "odontol", "dentista", "fisioterap", "nutricion", "psicólog", "fonoaudi", "biomédic", "saúde", "veterin", "enfermagem", "nutri", "terapia", "terapeuta", "maqueiro", "instrumentador", "combate às endemias", "residente em", "agente comunit", "radiolog", "laborat"] },
  { id: "educacao", nome: "Educação", palavras: ["professor", "pedagog", "docente", "magistério", "educação", "orientador educacional", "coordenador pedag", "peb ", "monitor escolar", "apoio escolar", "diretor de escola", "letras", "desenvolvimento infantil", "monitor de creche", "profissional de apoio", "supervisor de ensino"] },
  { id: "juridica", nome: "Direito / Jurídica", palavras: ["advogad", "procurador", "juiz", "promotor", "defensor", "analista judiciário", "técnico judiciário", "oficial de justiça", "jurídic", "direito"] },
  { id: "administrativa", nome: "Administração / Contábil", palavras: ["administra", "contador", "contábil", "contabil", "assistente administrativo", "auxiliar administrativo", "economista", "secretári", "auditor", "ciências contábeis", "tesoureiro", "financeiro", "compras", "recursos humanos", "agente de contratação", "planejamento", "orçamento", "controlador interno", "analista de comércio"] },
  { id: "engenharia", nome: "Engenharia / Arquitetura", palavras: ["engenheir", "arquitet", "agrônom", "geólog", "topógraf", "técnico em edifica", "engenharia", "técnico em (eletr|mecan|agrimens|automa|metal|minera|instrumenta|ferrament|metrolog)", "desenhista", "segurança do trabalho", "meio ambiente"] },
  { id: "seguranca", nome: "Segurança Pública", palavras: ["policial", "polícia", "soldado", "bombeiro", "guarda municipal", "agente penitenci", "perito", "delegado", "papiloscop", "agente de trânsito", "guarda civil", "inspetor de guarda", "guarda"] },
  { id: "fiscal", nome: "Fiscal / Tributária", palavras: ["fiscal", "auditor fiscal", "tributári", "receita"] },
  { id: "outras", nome: "Outras áreas", palavras: [] },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Classificação por palavras-chave; retorna null quando nada casa (candidato a fallback via IA). */
export function classificarArea(cargo: string, curso?: string | null): AreaId | null {
  const texto = norm(`${cargo} ${curso ?? ""}`);
  // fiscal antes de administrativa/jurídica para "auditor fiscal"
  const ordem = ["fiscal", ...AREAS.map((a) => a.id).filter((i) => i !== "fiscal")];
  for (const id of ordem) {
    const area = AREAS.find((a) => a.id === id)!;
    if (area.palavras.some((p) => new RegExp(norm(p)).test(texto))) return area.id;
  }
  return null;
}

export function nomeArea(id: string): string {
  return AREAS.find((a) => a.id === id)?.nome ?? id;
}
