-- DropForeignKey
ALTER TABLE "github_repo" DROP CONSTRAINT "github_repo_userId_fkey";

-- AlterTable
ALTER TABLE "github_repo" ALTER COLUMN "userId" DROP NOT NULL;
