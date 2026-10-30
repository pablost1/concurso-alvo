"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PainelProvas() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  async function lote() {
    setOcupado(true); setErro(""); setMsg("Processando o próximo lote… pode levar alguns minutos.");
    try {
      const r = await fetch("/api/cron/provas");
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      setMsg(`Lote concluído: ${j.processadas} prova(s) processadas, ${j.falhas} falha(s), ${j.restantes} ainda na fila.`);
      if (j.erros?.length) setErro(j.erros.slice(0, 3).join(" | "));
      router.refresh();
    } catch (e) { setErro((e as Error).message); setMsg(""); }
    finally { setOcupado(false); }
  }

  async function doAds() {
    setOcupado(true); setErro(""); setMsg("Importando do provas-ads…");
    try {
      const r = await fetch("/api/provas/importar-ads", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      setMsg(`provas-ads: ${j.questoes} questões novas em ${j.importadas} prova(s) (${j.semGabarito} sem gabarito e ${j.duplicadas} duplicadas ignoradas).`);
      router.refresh();
    } catch (e) { setErro((e as Error).message); setMsg(""); }
    finally { setOcupado(false); }
  }

  async function importar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setOcupado(true); setErro(""); setMsg("Lendo a prova… pode levar alguns minutos.");
    try {
      const r = await fetch("/api/provas/importar", { method: "POST", body: new FormData(form) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      setMsg(`Prova importada: ${j.questoes} questões.`);
      form.reset(); router.refresh();
    } catch (e) { setErro((e as Error).message); setMsg(""); }
    finally { setOcupado(false); }
  }

  return (
    <>
      <div className="card">
        <h2>Coletar do Cebraspe</h2>
        <p className="mut">Cada lote processa até 10 provas (ajustável em <code>PROVAS_POR_RODADA</code>) para respeitar o limite da IA. Também roda sozinho a cada 6 horas.</p>
        <button className="amarelo" onClick={lote} disabled={ocupado}>{ocupado ? "Processando…" : "Processar próximo lote"}</button>
      </div>
      <div className="card">
        <h2>Importar do provas-ads</h2>
        <p className="mut">Lê o <code>questoes.jsonl</code> do projeto vizinho (<code>PROVAS_ADS_DIR</code>, padrão <code>../provas-ads/out</code>). Só entram questões com gabarito; pode repetir sem duplicar.</p>
        <button className="verde" onClick={doAds} disabled={ocupado}>{ocupado ? "Importando…" : "Importar do provas-ads"}</button>
      </div>
      <div className="card">
        <h2>Importar prova (PDF)</h2>
        <form onSubmit={importar} className="col">
          <input name="orgao" placeholder="Órgão (ex.: TRT 8)" required />
          <input name="banca" placeholder="Banca (ex.: FCC)" required />
          <input name="cargo" placeholder="Cargo / área" required />
          <input name="ano" type="number" placeholder="Ano" />
          <label>Prova (PDF) <input name="prova" type="file" accept="application/pdf" required /></label>
          <label>Gabarito (PDF) <input name="gabarito" type="file" accept="application/pdf" required /></label>
          <button className="verde" type="submit" disabled={ocupado}>Importar</button>
        </form>
      </div>
      <p role="status" className="mut">{msg}</p>
      {erro && <p className="err" role="alert">{erro}</p>}
    </>
  );
}
