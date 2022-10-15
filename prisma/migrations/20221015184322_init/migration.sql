-- DropIndex
DROP INDEX "Profile_mode_userId_key";

-- AlterTable
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_pkey" PRIMARY KEY ("mode", "userId");
