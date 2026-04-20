/*
  Warnings:

  - A unique constraint covering the columns `[repoId]` on the table `github_repo` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "github_repo_repoId_key" ON "github_repo"("repoId");
