-- AlterTable
ALTER TABLE "Mode" ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "mvps" INTEGER NOT NULL DEFAULT 0;
