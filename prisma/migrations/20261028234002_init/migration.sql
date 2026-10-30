-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Concurso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgao" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "uf" TEXT NOT NULL DEFAULT 'BR',
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "fonteUrl" TEXT NOT NULL,
    "editalUrl" TEXT,
    "banca" TEXT,
    "inscricoesAte" DATETIME,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "verificadoEm" DATETIME,
    "fonteConfirmacaoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Cargo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "concursoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "escolaridade" TEXT,
    "curso" TEXT,
    "area" TEXT NOT NULL DEFAULT 'outras',
    "vagas" INTEGER,
    "salario" TEXT,
    CONSTRAINT "Cargo_concursoId_fkey" FOREIGN KEY ("concursoId") REFERENCES "Concurso" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alvo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cargoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alvo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Alvo_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cargoId" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "topicos" TEXT NOT NULL,
    "extraidoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tema_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fonte" TEXT NOT NULL,
    "iniciadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fimEm" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'rodando',
    "novos" INTEGER NOT NULL DEFAULT 0,
    "erros" TEXT
);

-- CreateTable
CREATE TABLE "Questao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cargoId" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "topico" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "alternativas" TEXT NOT NULL,
    "correta" INTEGER NOT NULL,
    "explicacao" TEXT NOT NULL,
    "dificuldade" INTEGER NOT NULL DEFAULT 1,
    "geradaPorIA" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Questao_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resposta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questaoId" TEXT NOT NULL,
    "escolhida" INTEGER NOT NULL,
    "acertou" BOOLEAN NOT NULL,
    "xpGanho" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resposta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Resposta_questaoId_fkey" FOREIGN KEY ("questaoId") REFERENCES "Questao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgressoTopico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cargoId" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "topico" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "recentes" TEXT NOT NULL DEFAULT '[]',
    "dominio" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "ProgressoTopico_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgressoCargo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cargoId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "proficiencia" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "ProgressoCargo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Perfil" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "streakDias" INTEGER NOT NULL DEFAULT 0,
    "ultimoEstudoEm" DATETIME,
    CONSTRAINT "Perfil_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Concurso_fonteUrl_key" ON "Concurso"("fonteUrl");

-- CreateIndex
CREATE INDEX "Cargo_area_idx" ON "Cargo"("area");

-- CreateIndex
CREATE UNIQUE INDEX "Cargo_concursoId_nome_key" ON "Cargo"("concursoId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Alvo_userId_cargoId_key" ON "Alvo"("userId", "cargoId");

-- CreateIndex
CREATE INDEX "Tema_cargoId_idx" ON "Tema"("cargoId");

-- CreateIndex
CREATE INDEX "Questao_cargoId_topico_idx" ON "Questao"("cargoId", "topico");

-- CreateIndex
CREATE INDEX "Resposta_userId_questaoId_idx" ON "Resposta"("userId", "questaoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressoTopico_userId_cargoId_disciplina_topico_key" ON "ProgressoTopico"("userId", "cargoId", "disciplina", "topico");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressoCargo_userId_cargoId_key" ON "ProgressoCargo"("userId", "cargoId");

-- CreateIndex
CREATE UNIQUE INDEX "Perfil_userId_key" ON "Perfil"("userId");
