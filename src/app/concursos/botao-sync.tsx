"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BotaoSync() {
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const router = useRouter();
  async function rodar() {
    setOcupado(true); setMsg("Buscando… pode levar alguns minutos.");
    try {
      const r = await fetch("/api/cron/sync");
      const j = await r.json();
      setMsg(r.ok ? `Concluído: ${j.novos} novos, ${j.atualizados} atualizados.` : `Erro: ${j.erro}`);
      router.refresh();
    } catch {
      setMsg("Falha de rede ao buscar.");
    } finally {
      setOcupado(false);
    }
  }
  return (
    <p>
      <button className="amarelo" onClick={rodar} disabled={ocupado}>{ocupado ? "Buscando…" : "Buscar concursos agora"}</button>{" "}
      <span className="mut" role="status">{msg}</span>
    </p>
  );
}
