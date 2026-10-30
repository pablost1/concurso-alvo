-- CreateTable
CREATE TABLE "ProvaPci" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "ano" INTEGER,
    "orgao" TEXT NOT NULL,
    "banca" TEXT NOT NULL,
    "buscadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id", "slug")
);

-- CreateTable
CREATE TABLE "SecaoPci" (
    "slug" TEXT NOT NULL PRIMARY KEY,
    "existe" BOOLEAN NOT NULL,
    "buscadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ProvaPci_slug_idx" ON "ProvaPci"("slug");
