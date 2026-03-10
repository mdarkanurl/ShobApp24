-- CreateEnum
CREATE TYPE "TypesOfGitHubAccount" AS ENUM ('User', 'Organization', 'Enterprise');

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
    "userId" TEXT NOT NULL,
    "installationId" INTEGER NOT NULL,
    "username" TEXT,
    "url" TEXT,
    "html_url" TEXT,
    "avatar_url" TEXT,
    "type" "TypesOfGitHubAccount",
    "repos_url" TEXT,
    "GitHubAccountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_repo" (
    "id" TEXT NOT NULL,
    "GithubConnectionsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL,

    CONSTRAINT "github_repo_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "github_connection_userId_key" ON "github_connection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "github_connection_installationId_key" ON "github_connection"("installationId");

-- CreateIndex
CREATE INDEX "github_connection_userId_idx" ON "github_connection"("userId");

-- CreateIndex
CREATE INDEX "github_repo_userId_repoId_idx" ON "github_repo"("userId", "repoId");

-- CreateIndex
CREATE UNIQUE INDEX "github_repo_GithubConnectionsId_repoId_userId_key" ON "github_repo"("GithubConnectionsId", "repoId", "userId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_connection" ADD CONSTRAINT "github_connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_repo" ADD CONSTRAINT "github_repo_GithubConnectionsId_fkey" FOREIGN KEY ("GithubConnectionsId") REFERENCES "github_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_repo" ADD CONSTRAINT "github_repo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
