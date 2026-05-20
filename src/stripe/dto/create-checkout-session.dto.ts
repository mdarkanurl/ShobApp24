import { z } from "zod";
import { SubscriptionsPlan } from "@prisma/client";

export const createCheckoutSessionSchema = z.object({
    plan: z.nativeEnum(SubscriptionsPlan),
});

export type CreateCheckoutSessionDto = z.infer<typeof createCheckoutSessionSchema>;
