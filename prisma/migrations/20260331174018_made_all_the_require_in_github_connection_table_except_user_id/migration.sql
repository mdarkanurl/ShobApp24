/*
  Warnings:

  - Made the column `username` on table `github_connection` required. This step will fail if there are existing NULL values in that column.
  - Made the column `url` on table `github_connection` required. This step will fail if there are existing NULL values in that column.
  - Made the column `html_url` on table `github_connection` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avatar_url` on table `github_connection` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `github_connection` required. This step will fail if there are existing NULL values in that column.
  - Made the column `repos_url` on table `github_connection` required. This step will fail if there are existing NULL values in that column.
  - Made the column `GitHubAccountId` on table `github_connection` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "github_connection" ALTER COLUMN "username" SET NOT NULL,
ALTER COLUMN "url" SET NOT NULL,
ALTER COLUMN "html_url" SET NOT NULL,
ALTER COLUMN "avatar_url" SET NOT NULL,
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "repos_url" SET NOT NULL,
ALTER COLUMN "GitHubAccountId" SET NOT NULL;
