-- AlterTable
ALTER TABLE "GithubConnections" ADD COLUMN     "GitHubAccountId" INTEGER,
ADD COLUMN     "repos_url" TEXT;

-- CreateTable
CREATE TABLE "GitHubRepo" (
    "id" TEXT NOT NULL,
    "GithubConnectionsId" TEXT NOT NULL,
    "repoId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL,

    CONSTRAINT "GitHubRepo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GitHubRepo" ADD CONSTRAINT "GitHubRepo_GithubConnectionsId_fkey" FOREIGN KEY ("GithubConnectionsId") REFERENCES "GithubConnections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
