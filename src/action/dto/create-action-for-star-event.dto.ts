import { ActionTypes, Platform } from "@prisma/client";
import { z } from "zod";

// helper schema
const sendEmailToMeStarEventConfigSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    subject: z.string().trim().min(3).max(900).optional(),
    body: z.string().trim().min(3).max(10000).optional(),
    do_you_want_viewer_info: z.boolean().default(false)
});

// star event schema
export const sendEmailToMeStarEvent = z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.send_email_for_star_event),
    config: sendEmailToMeStarEventConfigSchema,
    step: z.number(),
});

