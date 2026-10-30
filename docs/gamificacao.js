// Mesmas regras de src/lib/gamificacao.ts (conferidas por tests/demo-gamificacao.test.ts).
export const DOMINIO_MINIMO_QUESTOES = 3;
const JANELA = 5;

export function calcularXp({ acertou, dificuldade, sequenciaAcertos, repetidaHoje }) {
  if (repetidaHoje) return 0;
  if (!acertou) return 2;
  const mult = dificuldade >= 3 ? 2 : dificuldade === 2 ? 1.5 : 1;
  let xp = Math.round(10 * mult);
  if (sequenciaAcertos > 0 && sequenciaAcertos % 5 === 0) xp += 5;
  return xp;
}

export function calcularDominio(recentes, distintas) {
  if (recentes.length === 0) return 0;
  const ultimas = recentes.slice(-JANELA);
  let soma = 0;
  let pesos = 0;
  ultimas.forEach((v, i) => {
    const p = i + 1;
    soma += v * p;
    pesos += p;
  });
  const fator = Math.min(1, distintas / DOMINIO_MINIMO_QUESTOES);
  return (soma / pesos) * fator;
}

export function atualizarRecentes(recentes, acertou) {
  return [...recentes, acertou ? 1 : 0].slice(-JANELA);
}

export function calcularProficiencia(dominios) {
  if (dominios.length === 0) return 0;
  const media = dominios.reduce((a, b) => a + b, 0) / dominios.length;
  return Math.round(media * 1000) / 10;
}

export function calcularNivel(xpTotal) {
  return Math.floor(Math.sqrt(Math.max(0, xpTotal) / 100)) + 1;
}
