-- CreateEnum
CREATE TYPE "TypesOfGitHubAccount" AS ENUM ('User', 'Organization', 'Enterprise');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('Pending', 'Running', 'Succeeded', 'Failed', 'Skipped');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('GitHub');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('Active', 'Disabled');

-- CreateEnum
CREATE TYPE "ActionTypes" AS ENUM ('send_email', 'send_email_to_me', 'send_email_to_who_send_the_trigger', 'webhook', 'send_telegram');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('installation', 'star', 'watch', 'label', 'issues', 'issue_comment', 'push', 'pull_request', 'repository', 'commit_comment', 'fork', 'pull_request_review', 'create', 'delete', 'workflow_job', 'workflow_run');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_connection" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "installationId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "html_url" TEXT NOT NULL,
    "avatar_url" TEXT NOT NULL,
    "type" "TypesOfGitHubAccount" NOT NULL,
    "repos_url" TEXT NOT NULL,
    "GitHubAccountId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_repo" (
    "id" TEXT NOT NULL,
    "GithubConnectionsId" TEXT NOT NULL,
    "userId" TEXT,
    "repoId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL,

    CONSTRAINT "github_repo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "eventType" "EventType" NOT NULL,
    "action" TEXT,
    "config" JSONB,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "type" "ActionTypes" NOT NULL,
    "config" JSONB NOT NULL,
    "step" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_run" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "eventType" "EventType" NOT NULL,
    "payload" JSONB,
    "status" "RunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_run" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "action_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "github_connection_installationId_key" ON "github_connection"("installationId");

-- CreateIndex
CREATE INDEX "github_connection_userId_GitHubAccountId_idx" ON "github_connection"("userId", "GitHubAccountId");

-- CreateIndex
CREATE INDEX "github_repo_userId_repoId_idx" ON "github_repo"("userId", "repoId");

-- CreateIndex
CREATE UNIQUE INDEX "github_repo_GithubConnectionsId_repoId_userId_key" ON "github_repo"("GithubConnectionsId", "repoId", "userId");

-- CreateIndex
CREATE INDEX "workflow_userId_idx" ON "workflow"("userId");

-- CreateIndex
CREATE INDEX "action_workflowId_idx" ON "action"("workflowId");

-- CreateIndex
CREATE INDEX "action_platform_type_idx" ON "action"("platform", "type");

-- CreateIndex
CREATE INDEX "workflow_run_workflowId_idx" ON "workflow_run"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_run_platform_eventType_idx" ON "workflow_run"("platform", "eventType");

-- CreateIndex
CREATE INDEX "action_run_workflowRunId_idx" ON "action_run"("workflowRunId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_repo" ADD CONSTRAINT "github_repo_GithubConnectionsId_fkey" FOREIGN KEY ("GithubConnectionsId") REFERENCES "github_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action" ADD CONSTRAINT "action_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_run" ADD CONSTRAINT "action_run_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_run" ADD CONSTRAINT "action_run_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
