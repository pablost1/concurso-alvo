import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { getUserId } from "@/lib/session";
import { CAMINHO_ADS, importarProvasAds } from "@/lib/provas/importar-ads-db";

export const maxDuration = 300;

/** Importa o questoes.jsonl do provas-ads (arquivo local, somente leitura). */
export async function POST() {
  if (!(await getUserId())) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const arquivo = CAMINHO_ADS();
  if (!existsSync(arquivo)) {
    return NextResponse.json({ erro: `Arquivo não encontrado: ${arquivo}. Rode o extrator no provas-ads ou ajuste PROVAS_ADS_DIR.` }, { status: 404 });
  }
  try {
    return NextResponse.json(await importarProvasAds(arquivo));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
