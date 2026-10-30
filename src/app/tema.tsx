"use client";

import { useEffect, useState } from "react";

type Tema = "light" | "dark";

const lerSalvo = (): Tema | null => {
  try {
    const t = localStorage.getItem("tema");
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
};

/** Alterna claro/escuro; sem escolha salva, segue o sistema. O script do layout aplica o tema antes da pintura. */
export function AlternarTema() {
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    setTema(lerSalvo() ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  }, []);

  function alternar() {
    const novo: Tema = tema === "dark" ? "light" : "dark";
    setTema(novo);
    document.documentElement.dataset.theme = novo;
    try { localStorage.setItem("tema", novo); } catch { /* sem armazenamento: vale só nesta visita */ }
  }

  return (
    <button type="button" className="sec tema" onClick={alternar} aria-label={tema === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"} title={tema === "dark" ? "Modo claro" : "Modo escuro"}>
      {tema === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
