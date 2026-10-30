import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({ getUserId: async () => "u1" }));
import { GET } from "../src/app/api/provas/imagens/[...caminho]/route";

const chamar = (caminho: string[]) => GET(new Request("http://x"), { params: Promise.resolve({ caminho }) });

describe("rota de imagens das provas", () => {
  it("recusa extensões que não são imagem", async () => {
    expect((await chamar(["p", "segredo.txt"])).status).toBe(400);
  });
  it("recusa sair da pasta de imagens", async () => {
    expect((await chamar(["..", "..", "questoes.png"])).status).toBe(400);
  });
  it("devolve 404 para imagem inexistente", async () => {
    expect((await chamar(["p", "nao-existe.png"])).status).toBe(404);
  });
});

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("rota de imagens: arquivo existente", () => {
  it("serve o PNG com o tipo correto", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ads-"));
    mkdirSync(join(dir, "imagens", "prova"), { recursive: true });
    writeFileSync(join(dir, "imagens", "prova", "f.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    process.env.PROVAS_ADS_DIR = dir;
    const r = await chamar(["prova", "f.png"]);
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("image/png");
    delete process.env.PROVAS_ADS_DIR;
  });
});
