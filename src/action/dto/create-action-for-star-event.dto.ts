import { ActionTypes, Platform } from "@prisma/client";
import { z } from "zod";

// helper schema
const sendEmailToWhoStarTheRepoConfigSchema = z.object({
    subject: z.string().trim().min(3).max(900),
    body: z.string().trim().min(3).max(10000)
});

const sendEmailToMeStarEventConfigSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    subject: z.string().trim().min(3).max(900).optional(),
    body: z.string().trim().min(3).max(10000).optional(),
    do_you_want_viewer_info: z.boolean().default(false)
});

// star event schema
export const sendEmailToWhoStarTheRepo = z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.send_email_to_who_send_the_trigger),
    config: sendEmailToWhoStarTheRepoConfigSchema,
    step: z.number(),
});

export const sendEmailToMeStarEvent = z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.send_email_to_me),
    config: sendEmailToMeStarEventConfigSchema,
    step: z.number(),
});

