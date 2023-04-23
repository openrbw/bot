/*
  Warnings:

  - The primary key for the `GameUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `GameUser` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "winner" SMALLINT;

-- AlterTable
ALTER TABLE "GameUser" DROP CONSTRAINT "GameUser_pkey",
DROP COLUMN "id",
ADD COLUMN     "mu" DOUBLE PRECISION,
ADD COLUMN     "phi" DOUBLE PRECISION,
ADD COLUMN     "rv" DOUBLE PRECISION,
ADD CONSTRAINT "GameUser_pkey" PRIMARY KEY ("gameId", "userId");
