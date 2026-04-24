import { ActionTypes, Platform } from "@prisma/client";
import { z } from "zod";


// issues event schema
export const analyticsTheIssueAndGiveRatingEventSchema = z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.analytics_the_issue_and_give_rating),
    step: z.number(),
});

