-- CreateTable
CREATE TABLE "EventoBanca" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "banca" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ano" INTEGER,
    "orgaoChave" TEXT NOT NULL,
    "detalhado" BOOLEAN NOT NULL DEFAULT false,
    "casado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Prova" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prova_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoBanca" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestaoProva" (
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
    CONSTRAINT "QuestaoProva_provaId_fkey" FOREIGN KEY ("provaId") REFERENCES "Prova" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Resposta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questaoId" TEXT,
    "questaoProvaId" TEXT,
    "cargoId" TEXT,
    "escolhida" INTEGER NOT NULL,
    "acertou" BOOLEAN NOT NULL,
    "xpGanho" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resposta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Resposta_questaoId_fkey" FOREIGN KEY ("questaoId") REFERENCES "Questao" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Resposta_questaoProvaId_fkey" FOREIGN KEY ("questaoProvaId") REFERENCES "QuestaoProva" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Resposta" ("acertou", "createdAt", "escolhida", "id", "questaoId", "userId", "xpGanho") SELECT "acertou", "createdAt", "escolhida", "id", "questaoId", "userId", "xpGanho" FROM "Resposta";
DROP TABLE "Resposta";
ALTER TABLE "new_Resposta" RENAME TO "Resposta";
CREATE INDEX "Resposta_userId_questaoId_idx" ON "Resposta"("userId", "questaoId");
CREATE INDEX "Resposta_userId_questaoProvaId_idx" ON "Resposta"("userId", "questaoProvaId");
CREATE INDEX "Resposta_userId_cargoId_idx" ON "Resposta"("userId", "cargoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EventoBanca_banca_chave_key" ON "EventoBanca"("banca", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "Prova_provaUrl_key" ON "Prova"("provaUrl");

-- CreateIndex
CREATE INDEX "Prova_status_idx" ON "Prova"("status");

-- CreateIndex
CREATE INDEX "Prova_orgaoChave_idx" ON "Prova"("orgaoChave");

-- CreateIndex
CREATE UNIQUE INDEX "QuestaoProva_provaId_numero_key" ON "QuestaoProva"("provaId", "numero");
