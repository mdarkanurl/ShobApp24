import { SubscriptionsPlan } from "@prisma/client";
import { z } from "zod";

export const updateSubscriptionSchema = z.object({
    plan: z.nativeEnum(SubscriptionsPlan),
});

export type updateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>;
