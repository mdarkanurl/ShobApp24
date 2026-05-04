import { ActionTypes, Platform } from "@prisma/client";
import { z } from "zod";

// helper schema
const sendEmailPushEventConfigSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    subject: z.string().trim().min(3).max(900),
    body: z.string().trim().min(3).max(10000),
    do_you_want_to_send_push_info: z.boolean().default(false),
    do_you_want_AI_analytics_of_push_data: z.boolean().default(false)
});

const sendEmailToMePushEventConfigSchema = z.object({
    subject: z.string().trim().min(3).max(900).optional(),
    body: z.string().trim().min(3).max(10000).optional(),
    do_you_want_push_info: z.boolean().default(true),
    do_you_want_AI_analytics_of_push_data: z.boolean().default(false)
});

const sendEmailToWhoPushTheCommitConfigSchema = z.object({
    subject: z.string().trim().min(3).max(900).optional(),
    body: z.string().trim().min(3).max(10000).optional(),
    do_you_want_AI_analytics_of_push_data: z.boolean().default(false)
});

// push event schema
export const sendEmailPushEventSchema_update = z.object({
    type: z.literal(ActionTypes.send_email_for_push_event),
    config: sendEmailPushEventConfigSchema,
});

export const sendEmailToMePushEventSchema_update = z.object({
    type: z.literal(ActionTypes.send_email_to_me_for_push_event),
    config: sendEmailToMePushEventConfigSchema,
});

export const sendEmailToWhoPushTheCommitSchema_update = z.object({
    type: z.literal(ActionTypes.send_email_to_who_push_the_commit),
    config: sendEmailToWhoPushTheCommitConfigSchema,
});
