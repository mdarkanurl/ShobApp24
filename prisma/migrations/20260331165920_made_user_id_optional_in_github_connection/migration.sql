-- DropForeignKey
ALTER TABLE "github_connection" DROP CONSTRAINT "github_connection_userId_fkey";

-- AlterTable
ALTER TABLE "github_connection" ALTER COLUMN "userId" DROP NOT NULL;
