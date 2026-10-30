import Link from "next/link";
import type { ProvaDoBanco } from "@/lib/provas/simulado";

function Linha({ p }: { p: ProvaDoBanco }) {
  return (
    <li className="mut">
      {p.orgao} · {p.banca} · {p.ano ?? "s/ano"} — {p.cargoNome} <span className="badge">{p.questoes} questões</span>
    </li>
  );
}

/** Provas já no banco (inclui as vindas do provas-ads) ligadas ao concurso do alvo por órgão, banca e ano. */
export function ProvasNoBanco({ alvoId, dados }: { alvoId: string; dados: { banca: string | null; mesmoOrgao: ProvaDoBanco[]; mesmaBanca: ProvaDoBanco[] } }) {
  return (
    <details>
      <summary className="mut">Provas no banco para este concurso ({dados.mesmoOrgao.length} do mesmo órgão · {dados.mesmaBanca.length} da mesma banca)</summary>
      <div style={{ marginTop: 8 }}>
        <strong>Do mesmo órgão</strong>
        {dados.mesmoOrgao.length === 0
          ? <p className="mut">Nenhuma edição anterior deste órgão no banco ainda.</p>
          : <ul>{dados.mesmoOrgao.map((p) => <Linha key={p.id} p={p} />)}</ul>}
        {dados.banca && (
          <>
            <strong>Outras provas da banca {dados.banca}</strong>
            {dados.mesmaBanca.length === 0
              ? <p className="mut">Nenhuma outra prova dessa banca para este cargo.</p>
              : <ul>{dados.mesmaBanca.map((p) => <Linha key={p.id} p={p} />)}</ul>}
          </>
        )}
        <Link className="btn azul" href={`/simulado/${alvoId}`}>Fazer simulado</Link>
      </div>
    </details>
  );
}
