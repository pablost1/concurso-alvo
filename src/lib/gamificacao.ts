export const DOMINIO_MINIMO_QUESTOES = 3;
export const DOMINIO_DOMINADO = 0.8;
const JANELA = 5;

export function calcularXp(opts: {
  acertou: boolean;
  dificuldade: number;
  sequenciaAcertos: number; // acertos seguidos incluindo esta resposta
  repetidaHoje: boolean;
}): number {
  if (opts.repetidaHoje) return 0;
  if (!opts.acertou) return 2;
  const mult = opts.dificuldade >= 3 ? 2 : opts.dificuldade === 2 ? 1.5 : 1;
  let xp = Math.round(10 * mult);
  if (opts.sequenciaAcertos > 0 && opts.sequenciaAcertos % 5 === 0) xp += 5;
  return xp;
}

/** Média ponderada (mais recentes pesam mais) das últimas respostas únicas; 0 até haver respostas suficientes. */
export function calcularDominio(recentes: number[], distintas: number): number {
  if (recentes.length === 0) return 0;
  const ultimas = recentes.slice(-JANELA);
  let soma = 0;
  let pesos = 0;
  ultimas.forEach((v, i) => {
    const p = i + 1;
    soma += v * p;
    pesos += p;
  });
  const media = soma / pesos;
  // Sem o mínimo de questões distintas o domínio fica limitado proporcionalmente.
  const fator = Math.min(1, distintas / DOMINIO_MINIMO_QUESTOES);
  return media * fator;
}

export function atualizarRecentes(recentes: number[], acertou: boolean): number[] {
  return [...recentes, acertou ? 1 : 0].slice(-JANELA);
}

/** Proficiência 0–100: média dos domínios de todos os tópicos (não estudados contam 0). */
export function calcularProficiencia(dominios: number[]): number {
  if (dominios.length === 0) return 0;
  const media = dominios.reduce((a, b) => a + b, 0) / dominios.length;
  return Math.round(media * 1000) / 10;
}

export function calcularNivel(xpTotal: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xpTotal) / 100)) + 1;
}

export function atualizarStreak(
  streakAtual: number,
  ultimoEstudoEm: Date | null,
  agora: Date,
): number {
  const dia = (d: Date) => Math.floor(d.getTime() / 86400000);
  if (!ultimoEstudoEm) return 1;
  const diff = dia(agora) - dia(ultimoEstudoEm);
  if (diff === 0) return Math.max(1, streakAtual);
  if (diff === 1) return streakAtual + 1;
  return 1;
}
