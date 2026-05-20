/*
  Warnings:

  - Added the required column `localSubscriptionId` to the `Payments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Payments" DROP CONSTRAINT "Payments_stripeInvoiceId_fkey";

-- AlterTable
ALTER TABLE "Payments" ADD COLUMN     "localSubscriptionId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_localSubscriptionId_fkey" FOREIGN KEY ("localSubscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
