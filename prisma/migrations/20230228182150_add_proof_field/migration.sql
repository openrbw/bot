/*
  Warnings:

  - You are about to drop the column `stateId` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the `State` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `state` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_stateId_fkey";

-- DropForeignKey
ALTER TABLE "State" DROP CONSTRAINT "State_modeId_fkey";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "stateId",
ADD COLUMN     "proof" TEXT,
ADD COLUMN     "state" SMALLINT NOT NULL;

-- DropTable
DROP TABLE "State";
