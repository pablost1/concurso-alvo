import { USER_AGENT } from "./sources/pci";

type Regra = { permitir: boolean; padrao: RegExp; tamanho: number };
const cacheRobots = new Map<string, Regra[] | "bloquear">();
const ultimoAcesso = new Map<string, number>();

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ATRASO_MS = () => Number(process.env.CRAWL_DELAY_MS ?? 1000);

function padraoDeRegra(caminho: string): RegExp {
  const esc = caminho.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\$$/, "$");
  return new RegExp(`^${esc}`);
}

/** Interpreta o robots.txt para o nosso user-agent (ou "*"). */
export function interpretarRobots(txt: string): Regra[] {
  const grupos: { agentes: string[]; regras: Regra[] }[] = [];
  let atual: { agentes: string[]; regras: Regra[] } | null = null;
  let leuRegra = false;
  for (const bruta of txt.split(/\r?\n/)) {
    const linha = bruta.replace(/#.*/, "").trim();
    const m = linha.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const chave = m[1].toLowerCase(), valor = m[2].trim();
    if (chave === "user-agent") {
      if (!atual || leuRegra) { atual = { agentes: [], regras: [] }; grupos.push(atual); leuRegra = false; }
      atual.agentes.push(valor.toLowerCase());
    } else if ((chave === "allow" || chave === "disallow") && atual) {
      leuRegra = true;
      if (valor) atual.regras.push({ permitir: chave === "allow", padrao: padraoDeRegra(valor), tamanho: valor.length });
    }
  }
  const meu = USER_AGENT.split("/")[0].toLowerCase();
  const g = grupos.find((x) => x.agentes.includes(meu)) ?? grupos.find((x) => x.agentes.includes("*"));
  return g?.regras ?? [];
}

async function regrasDe(origem: string): Promise<Regra[] | "bloquear"> {
  const em = cacheRobots.get(origem);
  if (em) return em;
  let r: Regra[] | "bloquear";
  try {
    const res = await fetch(`${origem}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15000) });
    if (res.status === 404 || res.status === 410) r = [];
    else if (res.ok && !/<html/i.test((await res.clone().text()).slice(0, 200))) r = interpretarRobots(await res.text());
    else r = res.ok ? [] : "bloquear"; // 401/403/5xx: sem permissão explícita, não insistimos
  } catch {
    r = [];
  }
  cacheRobots.set(origem, r);
  return r;
}

export async function permitido(url: string): Promise<boolean> {
  const u = new URL(url);
  const regras = await regrasDe(u.origin);
  if (regras === "bloquear") return false;
  const alvo = u.pathname + u.search;
  let melhor: Regra | null = null;
  for (const r of regras) if (r.padrao.test(alvo) && (!melhor || r.tamanho > melhor.tamanho || (r.tamanho === melhor.tamanho && r.permitir))) melhor = r;
  return melhor ? melhor.permitir : true;
}

/** GET educado: respeita o robots.txt do domínio e espaça as requisições por host. */
export async function buscar(url: string, opts: { accept?: string; timeoutMs?: number } = {}): Promise<Response> {
  if (!(await permitido(url))) throw new Error(`Bloqueado pelo robots.txt: ${new URL(url).host}`);
  const host = new URL(url).host;
  const espera = (ultimoAcesso.get(host) ?? 0) + ATRASO_MS() - Date.now();
  if (espera > 0) await dormir(espera);
  ultimoAcesso.set(host, Date.now());
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, ...(opts.accept ? { Accept: opts.accept } : {}) },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res;
}
