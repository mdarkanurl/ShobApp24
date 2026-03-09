-- CreateEnum
CREATE TYPE "TypesOfGitHubAccount" AS ENUM ('User', 'Organization', 'Enterprise');

-- AlterTable
ALTER TABLE "GithubConnections" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "html_url" TEXT,
ADD COLUMN     "type" "TypesOfGitHubAccount",
ADD COLUMN     "url" TEXT,
ADD COLUMN     "username" TEXT;
