"use client";

import { useState } from "react";

type Disc = { disciplina: string; topicos: string[] };

export function PainelTemas({ alvoId, inicial, temEdital }: { alvoId: string; inicial: Disc[]; temEdital: boolean }) {
  const [disciplinas, setDisciplinas] = useState(inicial);
  const [estado, setEstado] = useState<"idle" | "carregando" | "erro">("idle");
  const [erro, setErro] = useState("");
  const [texto, setTexto] = useState("");

  async function salvarManual() {
    setEstado("carregando"); setErro("");
    try {
      const r = await fetch(`/api/alvos/${alvoId}/temas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      window.location.reload();
    } catch (e) {
      setErro((e as Error).message); setEstado("erro");
    }
  }

  async function extrair(pdf?: File) {
    setEstado("carregando"); setErro("");
    try {
      const fd = new FormData();
      if (pdf) fd.set("pdf", pdf);
      const r = await fetch(`/api/alvos/${alvoId}/temas`, { method: "POST", body: pdf ? fd : undefined });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      setDisciplinas(j.disciplinas); setEstado("idle");
      window.location.reload();
    } catch (e) {
      setErro((e as Error).message); setEstado("erro");
    }
  }

  if (disciplinas.length) {
    return (
      <div>
        {disciplinas.map((d) => (
          <details key={d.disciplina}>
            <summary><strong>{d.disciplina}</strong> <span className="mut">({d.topicos.length} tópicos)</span></summary>
            <ul className="topicos">{d.topicos.map((t) => <li key={t}>{t}</li>)}</ul>
          </details>
        ))}
      </div>
    );
  }
  return (
    <div>
      <p className="mut">Ainda não li o edital deste cargo.</p>
      <div className="row">
        <button onClick={() => extrair()} disabled={estado === "carregando" || !temEdital}>
          {estado === "carregando" ? "Lendo edital… (1–2 min)" : "Ler edital e extrair temas"}
        </button>
        <label className="btn sec">
          Enviar PDF do edital
          <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && extrair(e.target.files[0])} />
        </label>
      </div>
      {!temEdital && <p className="mut">Sem link oficial do edital — envie o PDF, informe o link abaixo ou digite os tópicos.</p>}
      <details>
        <summary className="mut">Digitar os tópicos manualmente</summary>
        <p className="mut">Uma disciplina por linha: <code>Banco de Dados: SQL; Normalização; Transações</code></p>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} style={{ width: "100%" }} aria-label="Tópicos do edital" />
        <button className="amarelo" onClick={salvarManual} disabled={estado === "carregando" || !texto.trim()}>Salvar tópicos</button>
      </details>
      {estado === "erro" && <p className="err" role="alert">{erro}</p>}
    </div>
  );
}
