import { z } from 'zod';

export const resetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(8).max(128)
});

export type resetPasswordSchemaSchemaDto = z.infer<typeof resetPasswordSchema>;