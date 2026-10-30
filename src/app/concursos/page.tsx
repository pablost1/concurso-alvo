import Link from "next/link";
import { prisma } from "@/lib/db";
import { AREAS, nomeArea } from "@/lib/areas";
import type { Prisma } from "@prisma/client";
import { BotaoSync } from "./botao-sync";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const POR_PAGINA = 20;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function Concursos(props: PageProps<"/concursos">) {
  const sp = await props.searchParams;
  const area = um(sp.area), uf = um(sp.uf), esc = um(sp.esc), q = um(sp.q).trim();
  const soVerificados = um(sp.v) === "1";
  const pagina = Math.max(1, parseInt(um(sp.p) || "1", 10) || 1);

  const cargoFiltro: Prisma.CargoWhereInput = {
    ...(area ? { area } : {}),
    ...(esc ? { escolaridade: { contains: esc } } : {}),
    ...(q ? { nome: { contains: q } } : {}),
  };
  const filtraCargo = Boolean(area || esc || q);
  const where: Prisma.ConcursoWhereInput = {
    status: "aberto",
    ...(uf ? { uf } : {}),
    ...(soVerificados ? { verificado: true } : {}),
    ...(filtraCargo ? { cargos: { some: cargoFiltro } } : {}),
  };

  const [total, concursos, ultimoSync] = await Promise.all([
    prisma.concurso.count({ where }),
    prisma.concurso.findMany({
      where, orderBy: [{ inscricoesAte: "asc" }], skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA,
      include: { cargos: { where: filtraCargo ? cargoFiltro : undefined, orderBy: { nome: "asc" } } },
    }),
    prisma.syncLog.findFirst({ orderBy: { iniciadoEm: "desc" } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (p: number) => {
    const s = new URLSearchParams();
    if (area) s.set("area", area); if (uf) s.set("uf", uf); if (esc) s.set("esc", esc);
    if (q) s.set("q", q); if (soVerificados) s.set("v", "1"); s.set("p", String(p));
    return `/concursos?${s}`;
  };

  return (
    <>
      <h1>Concursos abertos em todo o Brasil</h1>
      <form className="filtros" method="get">
        <select name="area" defaultValue={area} aria-label="Área">
          <option value="">Todas as áreas</option>
          {AREAS.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <select name="uf" defaultValue={uf} aria-label="UF">
          <option value="">Todo o Brasil</option>
          <option value="BR">Nacional</option>
          {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select name="esc" defaultValue={esc} aria-label="Escolaridade">
          <option value="">Qualquer escolaridade</option>
          <option value="Fundamental">Fundamental</option>
          <option value="Médio">Médio</option>
          <option value="Técnico">Técnico</option>
          <option value="Superior">Superior</option>
        </select>
        <input name="q" defaultValue={q} placeholder="Cargo (ex.: analista)" />
        <label className="row mut"><input type="checkbox" name="v" value="1" defaultChecked={soVerificados} /> só confirmados</label>
        <button type="submit">Filtrar</button>
      </form>
      <p className="mut">
        {total} concurso(s). {ultimoSync ? `Última busca: ${ultimoSync.iniciadoEm.toLocaleString("pt-BR")} (${ultimoSync.status}).` : "Nenhuma busca feita ainda."}
      </p>
      <BotaoSync />
      {concursos.length === 0 && <div className="card">Nenhum concurso encontrado. Clique em “Buscar concursos agora” para atualizar.</div>}
      {concursos.map((c) => (
        <div key={c.id} className="card">
          <div className="row">
            <strong><Link href={`/concursos/${c.id}`}>{c.orgao}</Link></strong>
            <span className="badge">{c.uf === "BR" ? "Nacional" : c.uf}</span>
            {c.banca && <span className="badge">{c.banca}</span>}
            {c.verificado
              ? <span className="badge ok" title={c.fonteConfirmacaoUrl ?? ""}>✔ Confirmado na fonte oficial</span>
              : <span className="badge warn">Não confirmado</span>}
          </div>
          <div className="mut">{c.titulo}{c.inscricoesAte ? ` · inscrições até ${c.inscricoesAte.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}</div>
          <ul className="topicos">
            {c.cargos.slice(0, 6).map((cg) => (
              <li key={cg.id}>{cg.nome} <span className="mut">· {nomeArea(cg.area)}{cg.escolaridade ? ` · ${cg.escolaridade}` : ""}{cg.vagas ? ` · ${cg.vagas} vaga(s)` : ""}</span></li>
            ))}
            {c.cargos.length > 6 && <li className="mut">+ {c.cargos.length - 6} cargo(s)</li>}
          </ul>
        </div>
      ))}
      <div className="row">
        {pagina > 1 && <Link className="btn sec" href={link(pagina - 1)}>← Anterior</Link>}
        <span className="mut">Página {pagina} de {paginas}</span>
        {pagina < paginas && <Link className="btn sec" href={link(pagina + 1)}>Próxima →</Link>}
      </div>
    </>
  );
}
