"use client";

import { CorpoQuestao } from "@/app/componentes/corpo-questao";
import { useState } from "react";

type Item = { competencia: string; nome: string; grupo: string; peso: number; dominio: number; disponiveis: number };
type Q = { id: string; numero: number; enunciado: string; alternativas: string[]; origem: string; competencia: { id: string; nome: string } | null; textoApoio?: string; imagens?: string[] };
type Resultado = {
  acertou: boolean; correta: number; explicacao: string; xpGanho: number; xpCargo: number;
  proficiencia: number; xpTotal: number; nivel: number; streakDias: number;
};

export function Estudo({ alvoId, itens, xpInicial, profInicial }: { alvoId: string; itens: Item[]; xpInicial: number; profInicial: number }) {
  const [fila, setFila] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [res, setRes] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [xp, setXp] = useState(xpInicial);
  const [prof, setProf] = useState(profInicial);

  async function iniciar(competencia?: string) {
    setCarregando(true); setErro(""); setRes(null); setEscolhida(null);
    try {
      const r = await fetch(`/api/alvos/${alvoId}/praticar${competencia ? `?competencia=${encodeURIComponent(competencia)}` : ""}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      if (!j.questoes.length) throw new Error("Sem questões inéditas nessa competência. Colete mais provas em /provas.");
      setFila(j.questoes); setIdx(0);
    } catch (e) { setErro((e as Error).message); }
    finally { setCarregando(false); }
  }

  async function responder(i: number) {
    if (res || escolhida !== null) return;
    setEscolhida(i);
    const r = await fetch("/api/respostas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questaoProvaId: fila[idx].id, alvoId, escolhida: i }),
    });
    const j = await r.json();
    if (!r.ok) { setErro(j.erro); setEscolhida(null); return; }
    setRes(j); setXp(j.xpCargo); setProf(j.proficiencia);
  }

  const q = fila[idx];
  const terminou = fila.length > 0 && idx >= fila.length;

  return (
    <>
      <div className="card">
        <div className="row"><span className="xp">{xp} XP neste cargo</span><span>Proficiência {prof}%</span></div>
        <div className="bar" aria-label="Proficiência do cargo"><i style={{ width: `${prof}%` }} /></div>
      </div>

      {!q || terminou ? (
        <>
          {terminou && <div className="card">Sessão concluída! Escolha outra competência ou continue.</div>}
          <div className="row">
            <button className="verde" onClick={() => iniciar()} disabled={carregando}>▶ Praticar o ponto mais fraco</button>
            {carregando && <span className="mut" role="status">Buscando questões…</span>}
          </div>
          {erro && <p className="err" role="alert">{erro}</p>}
          <h2>Competências do cargo</h2>
          <p className="mut">O peso mostra quanto cada competência aparece no conteúdo programático.</p>
          {itens.map((it) => (
            <div key={it.competencia} className="card">
              <div className="row">
                <strong style={{ flex: 1, minWidth: 180 }}>{it.nome} <span className="mut">· {it.grupo}</span></strong>
                <span className="mut">peso {Math.round(it.peso * 100)}% · {it.disponiveis} questões</span>
                <span>{Math.round(it.dominio * 100)}%</span>
                <button className="sec" disabled={carregando || it.disponiveis === 0} onClick={() => iniciar(it.competencia)}>Praticar</button>
              </div>
              <div className="bar" aria-label={`Domínio de ${it.nome}`}><i style={{ width: `${Math.round(it.dominio * 100)}%` }} /></div>
            </div>
          ))}
        </>
      ) : (
        <div className="card">
          <div className="mut">{q.origem} · {q.competencia?.nome} · questão {idx + 1}/{fila.length}</div>
          <CorpoQuestao enunciado={q.enunciado} textoApoio={q.textoApoio} imagens={q.imagens} />
          {q.alternativas.map((alt, i) => (
            <button
              key={i}
              className={`opt ${res ? (i === res.correta ? "certa" : i === escolhida ? "errada" : "") : ""}`}
              disabled={escolhida !== null}
              onClick={() => responder(i)}
            >
              {q.alternativas.length > 2 ? `${String.fromCharCode(65 + i)}) ` : ""}{alt}
            </button>
          ))}
          {erro && <p className="err" role="alert">{erro}</p>}
          {res && (
            <div role="status">
              <p><strong>{res.acertou ? "✔ Correto!" : "✘ Errou."}</strong> <span className="xp">+{res.xpGanho} XP</span> <span className="mut">· XP geral {res.xpTotal} · nível {res.nivel} · 🔥 {res.streakDias} dia(s)</span></p>
              <p className="mut">{res.explicacao}</p>
              <button onClick={() => { setIdx(idx + 1); setRes(null); setEscolhida(null); }}>{idx + 1 < fila.length ? "Próxima" : "Concluir"}</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
