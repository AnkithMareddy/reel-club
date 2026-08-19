-- CreateEnum
CREATE TYPE "WatchSource" AS ENUM ('CLUB_CYCLE', 'PERSONAL_LOG', 'LETTERBOXD_IMPORT', 'ADMIN_BACKFILL');

-- AlterTable
ALTER TABLE "WatchedMovie"
  ALTER COLUMN "clubId" DROP NOT NULL,
  ALTER COLUMN "cycleId" DROP NOT NULL,
  ADD COLUMN "loggedById" TEXT,
  ADD COLUMN "source" "WatchSource" NOT NULL DEFAULT 'CLUB_CYCLE';

-- AlterTable
ALTER TABLE "Rating" ALTER COLUMN "clubId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "WatchedMovie_loggedById_watchedAt_idx" ON "WatchedMovie"("loggedById", "watchedAt");

-- AddForeignKey
ALTER TABLE "WatchedMovie" ADD CONSTRAINT "WatchedMovie_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
