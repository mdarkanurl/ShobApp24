import { z } from "zod";

export const createCheckoutSessionSchema = z.object({
    plan: z.enum(["Basic", "Pro"]),
});

export type CreateCheckoutSessionDto = z.infer<typeof createCheckoutSessionSchema>;
