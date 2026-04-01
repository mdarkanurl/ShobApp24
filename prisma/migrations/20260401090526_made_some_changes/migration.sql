/*
  Warnings:

  - Changed the type of `eventType` on the `trigger` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `eventType` on the `workflow_run` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('star', 'watch', 'label', 'issues', 'issue_comment', 'push', 'pull_request', 'repository', 'commit_comment', 'fork', 'pull_request_review', 'create', 'delete', 'workflow_job', 'workflow_run');

-- DropIndex
DROP INDEX "github_connection_userId_installationId_idx";

-- AlterTable
ALTER TABLE "trigger" DROP COLUMN "eventType",
ADD COLUMN     "eventType" "EventType" NOT NULL;

-- AlterTable
ALTER TABLE "workflow_run" DROP COLUMN "eventType",
ADD COLUMN     "eventType" "EventType" NOT NULL;

-- CreateIndex
CREATE INDEX "github_connection_userId_GitHubAccountId_idx" ON "github_connection"("userId", "GitHubAccountId");

-- CreateIndex
CREATE INDEX "trigger_platform_eventType_idx" ON "trigger"("platform", "eventType");

-- CreateIndex
CREATE INDEX "workflow_run_platform_eventType_idx" ON "workflow_run"("platform", "eventType");
