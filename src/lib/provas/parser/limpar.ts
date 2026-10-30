/** Normaliza o texto extraído de PDF: remove cabeçalhos/rodapés repetidos e marcadores de página. */
export function limparTexto(bruto: string): string {
  const linhas = bruto.replace(/\r/g, "").split("\n");
  const freq = new Map<string, number>();
  for (const l of linhas) {
    const k = l.replace(/\s+/g, " ").trim();
    if (k.length > 12) freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  const saida: string[] = [];
  for (const l of linhas) {
    const k = l.replace(/\s+/g, " ").trim();
    if (/^-- \d+ of \d+ --$/.test(k)) continue; // marcador do extrator
    if (/^\|\|.*\|\|/.test(k)) continue; // código de barras/identificador da página
    if (/^(CEBRASPE|CESPE)\b.*(Edital|Aplica[çc][ãa]o)\b.*\d{4}$/.test(k)) continue; // cabeçalho
    // Cabeçalhos que se repetem em toda página (mas não frases de questão repetidas por acaso).
    if ((freq.get(k) ?? 0) >= 4 && k.length > 20 && /(CEBRASPE|CESPE|Aplica[çc][ãa]o|P[áa]gina|Edital)/i.test(k)) continue;
    saida.push(l);
  }
  return saida.join("\n");
}

/** Sinaliza questões que dependem de figura/texto-base que não vieram no enunciado. */
export function dependeDeApoio(texto: string): boolean {
  const t = texto.toLowerCase();
  if (/\b(figura|gr[áa]fico|diagrama|ilustra[çc][ãa]o|imagem|fluxograma|organograma|mapa|charge|tirinha|cartum)\b[^.?!]{0,60}\b(abaixo|acima|a seguir|seguinte|apresentad[oa]|ilustrad[oa]|mostrad[oa]|precedente)\b/.test(t)) return true;
  if (/\b(abaixo|acima|a seguir)\b[^.?!]{0,40}\b(figura|gr[áa]fico|diagrama|ilustra[çc][ãa]o|imagem|fluxograma)\b/.test(t)) return true;
  if (/\btexto\s+(?:[ivx]+|\d+[a-z]*\d*|[a-z]{1,4}\d[\w-]*)\b/.test(t)) return true;
  if (/\b(segundo|de acordo com|conforme|com base|a partir|no|do|pelo)\s+(?:o |a |no |do )?texto\b/.test(t)) return true;
  if (/\bfigura\s+\d+/.test(t)) return true;
  return false;
}
