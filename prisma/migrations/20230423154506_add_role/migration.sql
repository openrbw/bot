-- CreateTable
CREATE TABLE "Role" (
    "roleId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "ratingMin" INTEGER NOT NULL,
    "ratingMax" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("roleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_guildId_roleId_key" ON "Role"("guildId", "roleId");
