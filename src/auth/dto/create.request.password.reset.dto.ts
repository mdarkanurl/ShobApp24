import { z } from 'zod';

export const requestPasswordResetSchema = z.object({
    email: z.string().email()
});

export type requestPasswordResetSchemaDto = z.infer<typeof requestPasswordResetSchema>;