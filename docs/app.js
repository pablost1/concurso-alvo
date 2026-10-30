import { atualizarRecentes, calcularDominio, calcularNivel, calcularProficiencia, calcularXp } from "./gamificacao.js";

const CHAVE = "concurso-alvo-demo-v1";
const POR_PAGINA = 12;
const TAM_SIMULADO = 10;

const $app = document.getElementById("app");
const $menu = document.getElementById("menu");

/** Cria elementos sem innerHTML: todo texto vai por textContent. */
function h(tag, attrs = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style") el.style.cssText = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos.flat()) if (f != null && f !== false) el.append(f.nodeType ? f : document.createTextNode(String(f)));
  return el;
}

// ---------- estado (localStorage; funciona sem ele) ----------
const padrao = () => ({ logado: false, alvos: [], xp: 0, comp: {}, respondidas: {}, sequencia: 0 });
let memoria = padrao();
function carregar() {
  try { return { ...padrao(), ...JSON.parse(localStorage.getItem(CHAVE) || "{}") }; } catch { return memoria; }
}
let estado = carregar();
function salvar() {
  memoria = estado;
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch { /* sem armazenamento: vale só nesta visita */ }
}

// ---------- dados ----------
let dados;
const carregarDados = () => dados ?? (dados = fetch("data/demo.json").then((r) => { if (!r.ok) throw new Error("Não foi possível carregar os dados da demonstração."); return r.json(); }));

// ---------- tema ----------
function alternarTema() {
  const atual = document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const novo = atual === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = novo;
  try { localStorage.setItem("tema", novo); } catch { /* ignora */ }
  desenharMenu();
}

function desenharMenu() {
  const escuro = (document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
  const nivel = calcularNivel(estado.xp);
  $menu.replaceChildren(
    h("a", { href: "#/", class: "brand" }, "🎯 Concurso Alvo"),
    ...(estado.logado
      ? [
          h("a", { href: "#/concursos" }, "Concursos"),
          h("a", { href: "#/alvos" }, "Meus alvos"),
          h("a", { href: "#/competencias" }, "Competências"),
          h("a", { href: "#/alvos" }, `Nv ${nivel} · `, h("span", { class: "xp" }, `${estado.xp} XP`)),
          h("button", { class: "vermelho", type: "button", onclick: () => { estado.logado = false; salvar(); location.hash = "#/login"; } }, "Sair"),
        ]
      : [h("a", { href: "#/login" }, "Entrar")]),
    h("button", { class: "sec tema", type: "button", onclick: alternarTema, "aria-label": escuro ? "Mudar para modo claro" : "Mudar para modo escuro", title: escuro ? "Modo claro" : "Modo escuro" }, escuro ? "☀️" : "🌙"),
  );
}

// ---------- telas ----------
function telaInicio() {
  return h("div", { class: "card" },
    h("h1", {}, "Seu próximo concurso começa aqui"),
    h("p", {}, "Veja editais abertos, escolha o cargo-alvo e treine com questões de provas anteriores de TI — ganhando XP e subindo de nível."),
    h("div", { class: "row" }, h("a", { class: "btn verde", href: "#/login" }, "Entrar na demonstração")),
  );
}

function telaLogin() {
  const erro = h("p", { class: "err", role: "alert" });
  const usuario = h("input", { name: "usuario", autocomplete: "username", required: true, value: "" });
  const senha = h("input", { name: "senha", type: "password", autocomplete: "current-password", required: true });
  const form = h("form", { class: "col", onsubmit: (e) => {
    e.preventDefault();
    if (usuario.value.trim() === "guest" && senha.value === "guest") {
      estado.logado = true; salvar(); location.hash = "#/concursos";
    } else erro.textContent = "Usuário ou senha inválidos. Na demonstração, use guest / guest.";
  } },
    h("label", {}, "Usuário", usuario), h("label", {}, "Senha", senha),
    h("button", { class: "azul", type: "submit" }, "Entrar"), erro,
    h("p", { class: "mut" }, "Demonstração: o login é simulado no seu navegador — use ", h("code", {}, "guest"), " / ", h("code", {}, "guest"), "."),
  );
  return h("div", {}, h("h1", {}, "Entrar"), h("div", { class: "card" }, form));
}

async function telaConcursos(params) {
  const d = await carregarDados();
  const area = params.get("area") ?? "";
  const uf = params.get("uf") ?? "";
  const pagina = Math.max(1, Number(params.get("p") ?? 1));
  const alvoIds = new Set(estado.alvos.map((a) => a.cargoId));
  const filtrados = d.concursos.filter((c) => (!uf || c.uf === uf) && (!area || c.cargos.some((g) => g.area === area)));
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const ufs = [...new Set(d.concursos.map((c) => c.uf))].sort();
  const irPara = (mudancas) => {
    const p = new URLSearchParams({ area, uf, p: "1", ...mudancas });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    location.hash = `#/concursos?${p}`;
  };
  const selArea = h("select", { "aria-label": "Área", onchange: (e) => irPara({ area: e.target.value }) },
    h("option", { value: "" }, "Todas as áreas"),
    d.areas.map((a) => h("option", { value: a.id, selected: a.id === area }, a.nome)));
  const selUf = h("select", { "aria-label": "UF", onchange: (e) => irPara({ uf: e.target.value }) },
    h("option", { value: "" }, "Todo o Brasil"), ufs.map((u) => h("option", { value: u, selected: u === uf }, u)));

  return h("div", {},
    h("h1", {}, "Concursos abertos"),
    h("div", { class: "filtros" }, selArea, selUf),
    h("p", { class: "mut" }, `${filtrados.length} concurso(s) na amostra da demonstração.`),
    filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map((c) => {
      const cargos = c.cargos.filter((g) => !area || g.area === area);
      return h("div", { class: "card" },
        h("strong", {}, c.orgao), h("span", { class: "mut" }, `${c.uf}${c.inscricoesAte ? ` · inscrições até ${c.inscricoesAte.split("-").reverse().join("/")}` : ""}${c.banca ? ` · banca ${c.banca}` : ""}`),
        h("p", { class: "mut" }, c.titulo),
        h("div", {}, cargos.map((g) => h("div", { class: "row", style: "padding:4px 0" },
          h("span", { style: "flex:1" }, g.nome, g.area === "tecnologia" && h("span", { class: "badge ok", style: "margin-left:8px" }, "TI"), g.vagas ? h("span", { class: "mut" }, ` · ${g.vagas} vaga(s)`) : null),
          alvoIds.has(g.id)
            ? h("a", { class: "btn azul", href: "#/alvos" }, "✔ Alvo")
            : h("button", { class: "verde", type: "button", onclick: () => { estado.alvos.push({ cargoId: g.id, concursoId: c.id, xp: 0 }); salvar(); desenharMenu(); route(); } }, "🎯 Adicionar como alvo")))),
        h("a", { href: c.fonte, target: "_blank", rel: "noopener noreferrer" }, "Ver no PCI Concursos ↗"),
      );
    }),
    h("div", { class: "row" },
      pagina > 1 && h("button", { class: "sec", type: "button", onclick: () => irPara({ p: String(pagina - 1) }) }, "← Anterior"),
      h("span", { class: "mut" }, `Página ${pagina} de ${paginas}`),
      pagina < paginas && h("button", { class: "sec", type: "button", onclick: () => irPara({ p: String(pagina + 1) }) }, "Próxima →")),
  );
}

function dominioDe(compId) {
  const c = estado.comp[compId];
  return c ? calcularDominio(c.recentes, c.distintas.length) : 0;
}
const proficiencia = (d) => calcularProficiencia(d.competencias.filter((c) => !c.id.startsWith("ti.geral.")).map((c) => dominioDe(c.id)));

async function telaAlvos() {
  const d = await carregarDados();
  const mapaCargo = new Map();
  for (const c of d.concursos) for (const g of c.cargos) mapaCargo.set(g.id, { c, g });
  const prof = proficiencia(d);
  return h("div", {},
    h("h1", {}, "Meus alvos"),
    h("div", { class: "card" },
      h("div", { class: "row" }, h("strong", {}, `Nível ${calcularNivel(estado.xp)}`), h("span", { class: "xp" }, `${estado.xp} XP`), h("span", { class: "mut" }, `Proficiência geral em TI: ${prof}%`)),
      h("div", { class: "bar", "aria-label": "Proficiência" }, h("i", { style: `width:${prof}%` }))),
    estado.alvos.length === 0 && h("div", { class: "card" }, "Você ainda não escolheu nenhum cargo. ", h("a", { href: "#/concursos" }, "Ver concursos")),
    estado.alvos.map((a) => {
      const x = mapaCargo.get(a.cargoId);
      if (!x) return null;
      return h("div", { class: "card" },
        h("div", { class: "row" },
          h("strong", { style: "flex:1" }, x.g.nome, h("span", { class: "mut" }, ` · ${x.c.orgao}`)),
          h("button", { class: "vermelho", type: "button", onclick: () => { estado.alvos = estado.alvos.filter((y) => y.cargoId !== a.cargoId); salvar(); route(); } }, "Remover")),
        x.g.area === "tecnologia"
          ? h("div", { class: "row" }, h("span", { class: "xp" }, `${a.xp} XP neste cargo`), h("a", { class: "btn verde", href: `#/simulado/${a.cargoId}` }, "▶ Simulado de TI"))
          : h("p", { class: "mut" }, "A demonstração só tem questões de TI; escolha um cargo de tecnologia para treinar."));
    }),
  );
}

async function telaCompetencias() {
  const d = await carregarDados();
  const grupos = new Map();
  for (const c of d.competencias) grupos.set(c.grupo, [...(grupos.get(c.grupo) ?? []), c]);
  return h("div", {},
    h("h1", {}, "Competências de TI"),
    h("p", { class: "mut" }, `${d.questoes.length} questões de exemplo, classificadas por competência (a classificação do sistema completo é feita por dicionário de termos, sem IA).`),
    [...grupos].map(([g, lista]) => h("div", { class: "card" },
      h("strong", {}, d.grupos[g] ?? g),
      lista.map((c) => h("div", { class: "row" }, h("span", { style: "flex:1" }, c.nome), h("span", { class: "mut" }, `${c.n} questões`),
        h("div", { class: "bar", style: "width:120px" }, h("i", { style: `width:${Math.round(dominioDe(c.id) * 100)}%` })))))),
  );
}

function montarFila(d) {
  // Round-robin entre competências técnicas, priorizando as que o usuário domina menos; ignora as já respondidas.
  const disponiveis = d.questoes.filter((q) => !estado.respondidas[q.id] && (!q.c.startsWith("ti.geral.") || q.t));
  // Garante algumas questões com figura/texto de apoio no simulado.
  const apoio = disponiveis.filter((q) => q.t || q.i).sort(() => Math.random() - 0.5).slice(0, 3);
  const livres = disponiveis.filter((q) => !apoio.includes(q));
  const porComp = new Map();
  for (const q of livres) porComp.set(q.c, [...(porComp.get(q.c) ?? []), q]);
  const ordem = [...porComp.keys()].sort((a, b) => dominioDe(a) - dominioDe(b) || (a < b ? -1 : 1));
  for (const lista of porComp.values()) lista.sort(() => Math.random() - 0.5);
  const fila = [...apoio];
  while (fila.length < TAM_SIMULADO && ordem.some((c) => porComp.get(c).length)) {
    for (const c of ordem) { const q = porComp.get(c).pop(); if (q && fila.length < TAM_SIMULADO) fila.push(q); }
  }
  return fila.sort(() => Math.random() - 0.5);
}

async function telaSimulado(cargoId) {
  const d = await carregarDados();
  const alvo = estado.alvos.find((a) => a.cargoId === cargoId);
  if (!alvo) return h("div", { class: "card" }, "Alvo não encontrado. ", h("a", { href: "#/concursos" }, "Ver concursos"));
  const fila = montarFila(d);
  if (fila.length === 0) return h("div", { class: "card" }, "Você já respondeu todas as questões de exemplo. ", h("button", { class: "amarelo", type: "button", onclick: () => { estado.respondidas = {}; salvar(); route(); } }, "Recomeçar questões"));

  const nomeComp = new Map(d.competencias.map((c) => [c.id, c.nome]));
  let idx = 0, acertos = 0, ganho = 0;
  const raiz = h("div", {});
  function desenhar() {
    if (idx >= fila.length) {
      raiz.replaceChildren(h("h1", {}, "Resultado"), h("div", { class: "card" },
        h("p", {}, `Você acertou ${acertos} de ${fila.length}.`), h("p", { class: "xp" }, `+${ganho} XP`),
        h("div", { class: "row" }, h("a", { class: "btn azul", href: "#/alvos" }, "Meus alvos"), h("button", { class: "verde", type: "button", onclick: route }, "Novo simulado"))));
      return;
    }
    const q = fila[idx];
    let respondida = false;
    const info = h("p", { role: "status" });
    const proxima = h("button", { class: "azul", type: "button", style: "display:none", onclick: () => { idx++; desenhar(); } }, idx + 1 < fila.length ? "Próxima" : "Ver resultado");
    const botoes = q.a.map((texto, i) => h("button", { class: "opt", type: "button", onclick: () => {
      if (respondida) return;
      respondida = true;
      const acertou = i === q.r;
      const c = (estado.comp[q.c] ??= { recentes: [], distintas: [] });
      if (!c.distintas.includes(q.id)) c.distintas.push(q.id);
      c.recentes = atualizarRecentes(c.recentes, acertou);
      estado.sequencia = acertou ? estado.sequencia + 1 : 0;
      const xp = calcularXp({ acertou, dificuldade: 1, sequenciaAcertos: estado.sequencia, repetidaHoje: false });
      estado.xp += xp; alvo.xp += xp; ganho += xp; if (acertou) acertos++;
      estado.respondidas[q.id] = new Date().toISOString().slice(0, 10);
      salvar(); desenharMenu();
      botoes.forEach((b, j) => { b.disabled = true; if (j === q.r) b.classList.add("certa"); else if (j === i) b.classList.add("errada"); });
      info.textContent = acertou ? `Correto! +${xp} XP` : `Resposta correta: ${String.fromCharCode(65 + q.r)}. +${xp} XP`;
      proxima.style.display = "";
    } }, `${String.fromCharCode(65 + i)}) ${texto}`));
    raiz.replaceChildren(
      h("h1", {}, `Simulado — questão ${idx + 1}/${fila.length}`),
      h("div", { class: "card" },
        h("div", { class: "row mut" }, h("span", { class: "badge" }, nomeComp.get(q.c) ?? q.c), h("span", {}, q.o)),
        q.t && h("details", { class: "apoio", open: true }, h("summary", {}, "Texto de apoio"), h("p", {}, q.t)),
        q.i && h("div", { class: "figs" }, q.i.map((src) => h("img", { src, alt: "Figura da questão", loading: "lazy" }))),
        h("p", { style: "white-space:pre-wrap" }, q.e), botoes, info, proxima));
  }
  desenhar();
  return raiz;
}

// ---------- roteador ----------
const PROTEGIDAS = ["concursos", "alvos", "competencias", "simulado"];
async function route() {
  const [caminho, consulta = ""] = (location.hash.replace(/^#\/?/, "") || "").split("?");
  const [pagina, arg] = caminho.split("/");
  const params = new URLSearchParams(consulta);
  desenharMenu();
  if (PROTEGIDAS.includes(pagina) && !estado.logado) { location.hash = "#/login"; return; }
  if (pagina === "login" && estado.logado) { location.hash = "#/concursos"; return; }
  try {
    const tela = pagina === "login" ? telaLogin()
      : pagina === "concursos" ? await telaConcursos(params)
      : pagina === "alvos" ? await telaAlvos()
      : pagina === "competencias" ? await telaCompetencias()
      : pagina === "simulado" ? await telaSimulado(arg)
      : telaInicio();
    $app.replaceChildren(tela);
    window.scrollTo(0, 0);
  } catch (e) {
    $app.replaceChildren(h("p", { class: "err", role: "alert" }, e.message));
  }
}
addEventListener("hashchange", route);
route();
