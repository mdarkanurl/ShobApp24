import { z } from "zod";

export const verifyEmailSchema = z.object({
    token: z.string()
});

export type verifyEmailDto = z.infer<typeof verifyEmailSchema>;