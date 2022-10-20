-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('Ranked', 'Unranked', 'Open');

-- CreateEnum
CREATE TYPE "GameState" AS ENUM ('PickingTeams', 'BanningMaps', 'Playing', 'Scoring', 'Finished', 'Voided');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "leaderId" TEXT NOT NULL,
    "invites" TEXT[],

    CONSTRAINT "Party_pkey" PRIMARY KEY ("leaderId")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Map" (
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_lower" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "height" SMALLINT NOT NULL,

    CONSTRAINT "Map_pkey" PRIMARY KEY ("name_lower")
);

-- CreateTable
CREATE TABLE "PickedPlayer" (
    "userId" TEXT NOT NULL,
    "team" SMALLINT NOT NULL,
    "gameId" INTEGER NOT NULL,

    CONSTRAINT "PickedPlayer_pkey" PRIMARY KEY ("userId","gameId")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "state" "GameState" NOT NULL,
    "mode" "Mode" NOT NULL,
    "lastPickIndex" SMALLINT NOT NULL DEFAULT -1,
    "captains" TEXT[],
    "remainingIds" TEXT[],
    "textChannelId" TEXT NOT NULL,
    "voiceChannelIds" TEXT[],
    "bannedMaps" TEXT[],
    "captainMapBans" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faction" (
    "id" UUID NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Faction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "uuid" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "factionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partyId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "userId" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "winstreak" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "losestreak" INTEGER NOT NULL DEFAULT 0,
    "mvps" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("mode","userId")
);

-- CreateTable
CREATE TABLE "Event" (
    "messageId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("messageId")
);

-- CreateIndex
CREATE INDEX "PickedPlayer_userId_idx" ON "PickedPlayer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_textChannelId_key" ON "Game"("textChannelId");

-- CreateIndex
CREATE INDEX "Game_textChannelId_idx" ON "Game"("textChannelId");

-- CreateIndex
CREATE INDEX "Game_voiceChannelIds_idx" ON "Game"("voiceChannelIds");

-- CreateIndex
CREATE UNIQUE INDEX "User_uuid_key" ON "User"("uuid");

-- AddForeignKey
ALTER TABLE "PickedPlayer" ADD CONSTRAINT "PickedPlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("leaderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
