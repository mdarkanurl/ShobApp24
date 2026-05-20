/*
  Warnings:

  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_userId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_userId_fkey";

-- DropIndex
DROP INDEX "subscriptions_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "currentPeriodStart" TIMESTAMP(3),
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "stripeCustomerId" DROP NOT NULL,
ALTER COLUMN "stripePriceId" DROP NOT NULL,
ALTER COLUMN "currentPeriodEnd" DROP NOT NULL;

-- DropTable
DROP TABLE "payments";

-- CreateTable
CREATE TABLE "Payments" (
    "id" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentsStatus" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payments_stripeInvoiceId_key" ON "Payments"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "subscriptions_stripeSubscriptionId_idx" ON "subscriptions"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_stripeInvoiceId_fkey" FOREIGN KEY ("stripeInvoiceId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
