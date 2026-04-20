import { z } from 'zod';

export const resendVerifyEmailSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128)
});

export type resendVerifyEmailSchemaDto = z.infer<typeof resendVerifyEmailSchema>;