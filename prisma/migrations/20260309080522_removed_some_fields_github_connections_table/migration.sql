/*
  Warnings:

  - You are about to drop the column `accountId` on the `GithubConnections` table. All the data in the column will be lost.
  - You are about to drop the column `accountLogin` on the `GithubConnections` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GithubConnections" DROP COLUMN "accountId",
DROP COLUMN "accountLogin";
