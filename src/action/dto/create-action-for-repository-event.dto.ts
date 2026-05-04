import { ActionTypes, Platform } from "@prisma/client";
import { z } from "zod";

// helper function
const sendEmailRepoEventConfigSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    subject: z.string().trim().min(3).max(900).optional(),
    body: z.string().trim().min(3).max(10000).optional(),
    do_you_want_repo_info: z.boolean().default(false)
});

// repo event schema
export const sendEmailRepoEventSchema = z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.send_email_for_repository_event),
    config: sendEmailRepoEventConfigSchema,
    step: z.number(),
});

