/*
  Warnings:

  - Added the required column `userId` to the `action` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "action" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "action" ADD CONSTRAINT "action_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
