-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'CYCLE_RUNOFF_STARTED';

-- AlterTable
ALTER TABLE "Nomination" ADD COLUMN "eliminated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Cycle" ADD COLUMN "runoffRound" INTEGER NOT NULL DEFAULT 0;
