import { z } from 'zod';

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(8).max(128)
});

export type changePasswordSchemaDto = z.infer<typeof changePasswordSchema>;