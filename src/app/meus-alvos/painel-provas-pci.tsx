"use client";

import { useState } from "react";

type Prova = { id: string; url: string; cargo: string; ano: number | null; orgao: string; banca: string; noBanco: boolean };
type Resposta = { secoes: { slug: string; url: string }[]; esteConcurso: Prova[]; outrosConcursos: Prova[] };

const POR_PAGINA = 15;

function Lista({ titulo, vazio, itens }: { titulo: string; vazio: string; itens: Prova[] }) {
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  return (
    <div style={{ marginTop: 10 }}>
      <strong>{titulo} <span className="mut">({itens.length})</span></strong>
      {itens.length === 0 && <p className="mut">{vazio}</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: "6px 0" }}>
        {itens.slice(0, mostrar).map((p) => (
          <li key={p.id} className="row" style={{ gap: 8 }}>
            <span style={{ flex: 1 }}>
              {p.orgao} · {p.banca} · {p.ano ?? "s/ano"} <span className="mut">— {p.cargo}</span>
              {p.noBanco && <span className="mut"> · já no banco</span>}
            </span>
            <a href={p.url} target="_blank" rel="noopener noreferrer">Abrir no PCI ↗</a>
          </li>
        ))}
      </ul>
      {itens.length > mostrar && <button className="sec" type="button" onClick={() => setMostrar(mostrar + POR_PAGINA)}>Ver mais</button>}
    </div>
  );
}

export function PainelProvasPci({ alvoId }: { alvoId: string }) {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [estado, setEstado] = useState<"idle" | "carregando" | "erro">("idle");
  const [erro, setErro] = useState("");

  async function carregar() {
    if (dados || estado === "carregando") return;
    setEstado("carregando"); setErro("");
    try {
      const r = await fetch(`/api/alvos/${alvoId}/provas-pci`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      setDados(j); setEstado("idle");
    } catch (e) {
      setErro((e as Error).message); setEstado("erro");
    }
  }

  return (
    <details onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && carregar()}>
      <summary className="mut">Provas passadas para este cargo (links do PCI Concursos)</summary>
      <p className="mut">Abra o link, baixe a prova e o gabarito você mesmo e envie em <a href="/provas">Provas</a> (ou use o <code>provas-ads</code>).</p>
      {estado === "carregando" && <p className="mut">Consultando o PCI Concursos… (na primeira vez pode levar alguns segundos)</p>}
      {estado === "erro" && <p className="erro">{erro}</p>}
      {dados && (
        dados.secoes.length === 0
          ? <p className="mut">Não achei uma seção de provas deste cargo no PCI. <a href="https://www.pciconcursos.com.br/provas/" target="_blank" rel="noopener noreferrer">Buscar no PCI ↗</a></p>
          : <>
              <Lista titulo="Provas para este cargo neste concurso" vazio="Nenhuma edição anterior deste órgão encontrada no PCI." itens={dados.esteConcurso} />
              <Lista titulo="Provas para este cargo em outros concursos" vazio="Nenhuma prova encontrada." itens={dados.outrosConcursos} />
              <p className="mut">Seção completa: {dados.secoes.map((s) => <a key={s.slug} href={s.url} target="_blank" rel="noopener noreferrer" style={{ marginRight: 8 }}>{s.slug} ↗</a>)}</p>
            </>
      )}
    </details>
  );
}
