-- AlterTable
ALTER TABLE "User" ADD COLUMN     "partyId" TEXT;

-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);
