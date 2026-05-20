-- CreateEnum
CREATE TYPE "SubscriptionsPlan" AS ENUM ('Basic', 'Pro');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "plan" "SubscriptionsPlan";
