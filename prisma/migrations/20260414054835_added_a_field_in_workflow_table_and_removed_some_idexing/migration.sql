/*
  Warnings:

  - You are about to drop the column `userId` on the `github_repo` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[GithubConnectionsId,repoId]` on the table `github_repo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `repoId` to the `workflow` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "github_connection_userId_GitHubAccountId_idx";

-- DropIndex
DROP INDEX "github_repo_GithubConnectionsId_repoId_userId_key";

-- DropIndex
DROP INDEX "github_repo_userId_repoId_idx";

-- AlterTable
ALTER TABLE "github_repo" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "workflow" ADD COLUMN     "repoId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "github_connection_userId_idx" ON "github_connection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "github_repo_GithubConnectionsId_repoId_key" ON "github_repo"("GithubConnectionsId", "repoId");

-- AddForeignKey
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "github_repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
