/*
  Warnings:

  - Added the required column `userId` to the `trigger` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "trigger" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "trigger" ADD CONSTRAINT "trigger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
