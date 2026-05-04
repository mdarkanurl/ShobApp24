/*
  Warnings:

  - The values [send_email,send_email_to_me] on the enum `ActionTypes` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActionTypes_new" AS ENUM ('collect_viewer_data', 'webhook', 'send_telegram', 'analytics_data_by_AI', 'send_email_to_who_send_the_trigger', 'send_email_to_who_push_the_commit', 'send_email_to_me_for_push_event', 'send_email_for_push_event', 'analytics_the_issue_and_give_rating', 'send_email_for_issues_event', 'send_email_to_me_for_issues_event', 'send_email_for_repository_event', 'send_email_for_star_event');
ALTER TABLE "action" ALTER COLUMN "type" TYPE "ActionTypes_new" USING ("type"::text::"ActionTypes_new");
ALTER TYPE "ActionTypes" RENAME TO "ActionTypes_old";
ALTER TYPE "ActionTypes_new" RENAME TO "ActionTypes";
DROP TYPE "public"."ActionTypes_old";
COMMIT;
