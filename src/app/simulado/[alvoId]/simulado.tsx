"use client";

import Link from "next/link";
import { useState } from "react";

type Q = {
  id: string; numero: number; enunciado: string; alternativas: string[]; origem: string;
  competencia: { id: string; nome: string } | null;
};
type Resultado = { acertou: boolean; correta: number; explicacao: string; xpGanho: number; proficiencia: number; xpTotal: number };
type Cobertura = { competencia: string; nome: string; pedidas: number; entregues: number };
type Modo = "cargo" | "concurso" | "cruzado";

const MODOS: { id: Modo; titulo: string; texto: string }[] = [
  { id: "cargo", titulo: "Prova do cargo (por competências)", texto: "Monta a prova seguindo o peso de cada competência do edital, com questões de todas as provas do banco." },
  { id: "concurso", titulo: "Só deste concurso", texto: "Apenas provas anteriores do mesmo órgão e cargo/área." },
  { id: "cruzado", titulo: "Cruzado (correlatas)", texto: "Provas de outros concursos, nas mesmas competências do seu edital." },
];

export function Simulado({ alvoId, cargo, concurso, cruzado }: { alvoId: string; cargo: number; concurso: number; cruzado: number }) {
  const disp: Record<Modo, number> = { cargo, concurso, cruzado };
  const [modo, setModo] = useState<Modo>("cargo");
  const [n, setN] = useState(20);
  const [fila, setFila] = useState<Q[]>([]);
  const [cobertura, setCobertura] = useState<Cobertura[]>([]);
  const [idx, setIdx] = useState(0);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [res, setRes] = useState<Resultado | null>(null);
  const [historico, setHistorico] = useState<{ q: Q; escolhida: number; r: Resultado }[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [rodando, setRodando] = useState(false);

  async function iniciar() {
    setCarregando(true); setErro("");
    try {
      const r = await fetch(`/api/alvos/${alvoId}/simulado?modo=${modo}&n=${n}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      if (!j.questoes.length) throw new Error("Sem questões disponíveis neste modo.");
      setFila(j.questoes); setCobertura(j.cobertura ?? []); setIdx(0); setHistorico([]); setRes(null); setEscolha(null); setRodando(true);
    } catch (e) { setErro((e as Error).message); }
    finally { setCarregando(false); }
  }

  async function responder(i: number) {
    if (escolha !== null) return;
    setEscolha(i);
    const r = await fetch("/api/respostas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questaoProvaId: fila[idx].id, alvoId, escolhida: i }),
    });
    const j = await r.json();
    if (!r.ok) { setErro(j.erro); setEscolha(null); return; }
    setRes(j);
    setHistorico((h) => [...h, { q: fila[idx], escolhida: i, r: j }]);
  }

  const terminou = rodando && idx >= fila.length;
  const q = fila[idx];

  if (!rodando || terminou) {
    const acertos = historico.filter((h) => h.r.acertou).length;
    const faltas = cobertura.filter((c) => c.entregues < c.pedidas);
    const porComp = new Map<string, { nome: string; ok: number; total: number }>();
    for (const h of historico) {
      const k = h.q.competencia?.id ?? "?";
      const e = porComp.get(k) ?? { nome: h.q.competencia?.nome ?? "Outras", ok: 0, total: 0 };
      e.total++; if (h.r.acertou) e.ok++;
      porComp.set(k, e);
    }
    return (
      <>
        {terminou && (
          <div className="card" role="status">
            <h2>Resultado: {acertos} de {historico.length} ({Math.round((acertos / Math.max(1, historico.length)) * 100)}%)</h2>
            <p className="xp">+{historico.reduce((s, h) => s + h.r.xpGanho, 0)} XP · proficiência {historico.at(-1)?.r.proficiencia ?? 0}%</p>
            <h3>Por competência</h3>
            {[...porComp.values()].map((c) => <div key={c.nome} className="row"><span style={{ flex: 1 }}>{c.nome}</span><span>{c.ok}/{c.total}</span></div>)}
            {historico.filter((h) => !h.r.acertou).slice(0, 10).map((h) => (
              <details key={h.q.id}>
                <summary>Errou · {h.q.origem} · questão {h.q.numero}</summary>
                <p style={{ whiteSpace: "pre-wrap" }}>{h.q.enunciado}</p>
                <p className="mut">Sua resposta: {h.q.alternativas[h.escolhida]} · Gabarito: {h.q.alternativas[h.r.correta]}</p>
              </details>
            ))}
            {faltas.length > 0 && (
              <p className="mut">Faltaram questões em: {faltas.map((c) => `${c.nome} (${c.entregues}/${c.pedidas})`).join(", ")}. <Link href="/provas">Coletar mais provas</Link>.</p>
            )}
          </div>
        )}
        <div className="card">
          <h2>Montar simulado</h2>
          <div className="row" role="radiogroup" aria-label="Modo do simulado">
            {MODOS.map((m) => (
              <label key={m.id} className="card" style={{ flex: 1, minWidth: 220, borderColor: modo === m.id ? "var(--pri)" : undefined }}>
                <input type="radio" name="modo" checked={modo === m.id} onChange={() => setModo(m.id)} /> <strong>{m.titulo}</strong>
                <div className="mut">{m.texto} <strong>{disp[m.id]}</strong> questões inéditas.</div>
              </label>
            ))}
          </div>
          <div className="row">
            <label>Questões: <select value={n} onChange={(e) => setN(Number(e.target.value))}>{[10, 20, 40, 60].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
            <button className="verde" onClick={iniciar} disabled={carregando || disp[modo] === 0}>{carregando ? "Montando…" : "▶ Iniciar simulado"}</button>
            <Link className="btn sec" href="/provas">Provas no banco</Link>
          </div>
          {disp[modo] === 0 && <p className="mut">Nada disponível neste modo ainda. Colete mais provas em <Link href="/provas">/provas</Link>.</p>}
          {erro && <p className="err" role="alert">{erro}</p>}
        </div>
      </>
    );
  }

  return (
    <div className="card">
      <div className="mut">{q.origem} · questão {q.numero} · {q.competencia?.nome ?? "—"} · {idx + 1}/{fila.length}</div>
      <p style={{ whiteSpace: "pre-wrap" }}>{q.enunciado}</p>
      {q.alternativas.map((alt, i) => (
        <button key={i} disabled={escolha !== null}
          className={`opt ${res ? (i === res.correta ? "certa" : i === escolha ? "errada" : "") : ""}`}
          onClick={() => responder(i)}>
          {q.alternativas.length > 2 ? `${String.fromCharCode(65 + i)}) ` : ""}{alt}
        </button>
      ))}
      {erro && <p className="err" role="alert">{erro}</p>}
      {res && (
        <div role="status">
          <p><strong>{res.acertou ? "✔ Correto!" : "✘ Errou."}</strong> <span className="xp">+{res.xpGanho} XP</span></p>
          <p className="mut">{res.explicacao}</p>
          <button onClick={() => { setIdx(idx + 1); setRes(null); setEscolha(null); }}>{idx + 1 < fila.length ? "Próxima" : "Ver resultado"}</button>
        </div>
      )}
    </div>
  );
}
