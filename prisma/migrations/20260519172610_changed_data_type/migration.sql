/*
  Warnings:

  - The `currentPeriodEnd` column on the `subscriptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `currentPeriodStart` column on the `subscriptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `paidAt` on the `Payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Payments" DROP COLUMN "paidAt",
ADD COLUMN     "paidAt" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "currentPeriodEnd",
ADD COLUMN     "currentPeriodEnd" INTEGER,
DROP COLUMN "currentPeriodStart",
ADD COLUMN     "currentPeriodStart" INTEGER;
