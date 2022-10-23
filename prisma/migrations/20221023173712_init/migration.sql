-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedUntil" BIGINT;

-- AddForeignKey
ALTER TABLE "PickedPlayer" ADD CONSTRAINT "PickedPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
