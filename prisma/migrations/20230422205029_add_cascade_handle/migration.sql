-- DropForeignKey
ALTER TABLE "Faction" DROP CONSTRAINT "Faction_leaderId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_modeId_fkey";

-- DropForeignKey
ALTER TABLE "GameUser" DROP CONSTRAINT "GameUser_gameId_fkey";

-- DropForeignKey
ALTER TABLE "MinecraftUser" DROP CONSTRAINT "MinecraftUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "Party" DROP CONSTRAINT "Party_leaderId_fkey";

-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_modeId_fkey";

-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_userId_fkey";

-- AlterTable
ALTER TABLE "Mode" ALTER COLUMN "maximumStdDev" SET DEFAULT -1;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameUser" ADD CONSTRAINT "GameUser_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_modeId_fkey" FOREIGN KEY ("modeId") REFERENCES "Mode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faction" ADD CONSTRAINT "Faction_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_modeId_fkey" FOREIGN KEY ("modeId") REFERENCES "Mode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinecraftUser" ADD CONSTRAINT "MinecraftUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
