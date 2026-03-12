-- DropIndex
DROP INDEX "github_connection_userId_idx";

-- CreateIndex
CREATE INDEX "github_connection_userId_installationId_idx" ON "github_connection"("userId", "installationId");
