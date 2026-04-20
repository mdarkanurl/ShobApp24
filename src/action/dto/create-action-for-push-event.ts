import { ActionTypes, Platform } from "@prisma/client";
import { z } from "zod";

// helper schema

const sendEmailPushEventConfigSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    subject: z.string().trim().min(3).max(900),
    body: z.string().trim().min(3).max(10000),
    do_you_want_to_send_push_info: z.boolean().default(false)
});

const sendEmailToMePushEventConfigSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    subject: z.string().trim().min(3).max(900).optional(),
    body: z.string().trim().min(3).max(10000).optional(),
    do_you_want_push_info: z.boolean().default(true),
    do_you_want_AI_analytics_of_push_data: z.boolean().default(false)
});

// push event schema
export const sendEmailPushEventSchema = z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.send_email),
    config: sendEmailPushEventConfigSchema,
    step: z.number(),
});

export const sendEmailToMePushEventSchema = z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.send_email_to_me),
    config: sendEmailToMePushEventConfigSchema,
    step: z.number(),
});

