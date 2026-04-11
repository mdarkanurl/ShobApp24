/*
  Warnings:

  - You are about to drop the column `workflowRunId` on the `action_run` table. All the data in the column will be lost.
  - You are about to drop the `workflow_run` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "ActionTypes" ADD VALUE 'collect_viewer_data';

-- DropForeignKey
ALTER TABLE "action_run" DROP CONSTRAINT "action_run_workflowRunId_fkey";

-- DropForeignKey
ALTER TABLE "workflow_run" DROP CONSTRAINT "workflow_run_workflowId_fkey";

-- DropIndex
DROP INDEX "action_run_workflowRunId_idx";

-- AlterTable
ALTER TABLE "action_run" DROP COLUMN "workflowRunId";

-- DropTable
DROP TABLE "workflow_run";
