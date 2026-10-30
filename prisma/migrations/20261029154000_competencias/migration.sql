-- CreateTable
CREATE TABLE "ConteudoEdital" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "banca" TEXT NOT NULL,
    "eventoChave" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "ano" INTEGER,
    "cargoNome" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "itens" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventoBanca" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "banca" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ano" INTEGER,
    "orgaoChave" TEXT NOT NULL,
    "detalhado" BOOLEAN NOT NULL DEFAULT false,
    "casado" BOOLEAN NOT NULL DEFAULT false,
    "temTI" BOOLEAN NOT NULL DEFAULT false,
    "editalArquivo" TEXT,
    "conteudoLido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_EventoBanca" ("ano", "banca", "casado", "chave", "createdAt", "detalhado", "id", "nome", "orgaoChave") SELECT "ano", "banca", "casado", "chave", "createdAt", "detalhado", "id", "nome", "orgaoChave" FROM "EventoBanca";
DROP TABLE "EventoBanca";
ALTER TABLE "new_EventoBanca" RENAME TO "EventoBanca";
CREATE UNIQUE INDEX "EventoBanca_banca_chave_key" ON "EventoBanca"("banca", "chave");
CREATE TABLE "new_Prova" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventoId" TEXT,
    "orgao" TEXT NOT NULL,
    "orgaoChave" TEXT NOT NULL,
    "banca" TEXT NOT NULL,
    "ano" INTEGER,
    "cargoNome" TEXT NOT NULL,
    "area" TEXT,
    "provaUrl" TEXT NOT NULL,
    "gabaritoUrl" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'banca',
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "erro" TEXT,
    "totalQuestoes" INTEGER NOT NULL DEFAULT 0,
    "ti" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prova_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoBanca" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Prova" ("ano", "area", "banca", "cargoNome", "createdAt", "erro", "eventoId", "gabaritoUrl", "id", "orgao", "orgaoChave", "origem", "provaUrl", "status", "totalQuestoes") SELECT "ano", "area", "banca", "cargoNome", "createdAt", "erro", "eventoId", "gabaritoUrl", "id", "orgao", "orgaoChave", "origem", "provaUrl", "status", "totalQuestoes" FROM "Prova";
DROP TABLE "Prova";
ALTER TABLE "new_Prova" RENAME TO "Prova";
CREATE UNIQUE INDEX "Prova_provaUrl_key" ON "Prova"("provaUrl");
CREATE INDEX "Prova_status_idx" ON "Prova"("status");
CREATE INDEX "Prova_orgaoChave_idx" ON "Prova"("orgaoChave");
CREATE TABLE "new_QuestaoProva" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "disciplina" TEXT NOT NULL,
    "topico" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "alternativas" TEXT NOT NULL,
    "correta" INTEGER,
    "tipo" TEXT NOT NULL,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "competencia" TEXT,
    "dependeDeApoio" BOOLEAN NOT NULL DEFAULT false,
    "hash" TEXT,
    CONSTRAINT "QuestaoProva_provaId_fkey" FOREIGN KEY ("provaId") REFERENCES "Prova" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_QuestaoProva" ("alternativas", "anulada", "correta", "disciplina", "enunciado", "id", "numero", "provaId", "tipo", "topico") SELECT "alternativas", "anulada", "correta", "disciplina", "enunciado", "id", "numero", "provaId", "tipo", "topico" FROM "QuestaoProva";
DROP TABLE "QuestaoProva";
ALTER TABLE "new_QuestaoProva" RENAME TO "QuestaoProva";
CREATE INDEX "QuestaoProva_competencia_idx" ON "QuestaoProva"("competencia");
CREATE INDEX "QuestaoProva_hash_idx" ON "QuestaoProva"("hash");
CREATE UNIQUE INDEX "QuestaoProva_provaId_numero_key" ON "QuestaoProva"("provaId", "numero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ConteudoEdital_cargoNome_idx" ON "ConteudoEdital"("cargoNome");

-- CreateIndex
CREATE UNIQUE INDEX "ConteudoEdital_banca_eventoChave_cargoNome_disciplina_key" ON "ConteudoEdital"("banca", "eventoChave", "cargoNome", "disciplina");
