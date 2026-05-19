import { z } from "zod";

export const updateSubscriptionSchema = z.object({
    plan: z.enum(["Basic", "Pro"]),
});

export type updateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>;
