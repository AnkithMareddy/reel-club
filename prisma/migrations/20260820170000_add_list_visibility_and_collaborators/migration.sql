-- CreateEnum
CREATE TYPE "ListVisibility" AS ENUM ('PRIVATE', 'FRIENDS', 'PUBLIC');

-- AlterTable
ALTER TABLE "MovieList" ADD COLUMN "visibility" "ListVisibility" NOT NULL DEFAULT 'PRIVATE';

-- CreateTable
CREATE TABLE "MovieListCollaborator" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieListCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovieListCollaborator_userId_idx" ON "MovieListCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieListCollaborator_listId_userId_key" ON "MovieListCollaborator"("listId", "userId");

-- AddForeignKey
ALTER TABLE "MovieListCollaborator" ADD CONSTRAINT "MovieListCollaborator_listId_fkey" FOREIGN KEY ("listId") REFERENCES "MovieList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieListCollaborator" ADD CONSTRAINT "MovieListCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
