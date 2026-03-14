-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('Pending', 'Running', 'Succeeded', 'Failed', 'Skipped');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('GitHub', 'LinkedIn', 'Other');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('Active', 'Disabled');

-- CreateEnum
CREATE TYPE "ActionTypes" AS ENUM ('send_email', 'send_telegram');

-- CreateTable
CREATE TABLE "workflow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trigger" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "eventType" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trigger_pkey" PRIMARY KEY ("id")
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
    "eventType" TEXT NOT NULL,
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
CREATE INDEX "workflow_userId_idx" ON "workflow"("userId");

-- CreateIndex
CREATE INDEX "workflow_platform_idx" ON "workflow"("platform");

-- CreateIndex
CREATE INDEX "trigger_workflowId_idx" ON "trigger"("workflowId");

-- CreateIndex
CREATE INDEX "trigger_platform_eventType_idx" ON "trigger"("platform", "eventType");

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
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trigger" ADD CONSTRAINT "trigger_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action" ADD CONSTRAINT "action_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_run" ADD CONSTRAINT "action_run_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_run" ADD CONSTRAINT "action_run_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
