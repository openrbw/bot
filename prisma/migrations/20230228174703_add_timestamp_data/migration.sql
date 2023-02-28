/*
  Warnings:

  - You are about to drop the column `lastPickIndex` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `remainingIds` on the `Game` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[uuid]` on the table `MinecraftUser` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `guildId` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `MinecraftUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uuid` to the `MinecraftUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Faction" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "lastPickIndex",
DROP COLUMN "remainingIds",
ADD COLUMN     "guildId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MinecraftUser" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "username" TEXT NOT NULL,
ADD COLUMN     "uuid" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Mode" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "mu" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "phi" DOUBLE PRECISION NOT NULL DEFAULT 2.01476187242,
ADD COLUMN     "rv" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "rating" SET DEFAULT 400;

-- AlterTable
ALTER TABLE "Queue" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "State" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftUser_uuid_key" ON "MinecraftUser"("uuid");
