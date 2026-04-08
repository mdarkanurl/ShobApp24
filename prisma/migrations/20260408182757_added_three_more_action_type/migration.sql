-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActionTypes" ADD VALUE 'send_email_to_me';
ALTER TYPE "ActionTypes" ADD VALUE 'send_email_to_who_send_the_trigger';
ALTER TYPE "ActionTypes" ADD VALUE 'webhook';
