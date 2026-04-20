import { z } from 'zod';

export const createUserSchema = z.object({
    name: z.string(),
    email: z.string(),
    password: z.string().min(8).max(128),
    image: z.string().optional(),
    callbackURL: z.string().optional()
});

export type CreateUserDto = z.infer<typeof createUserSchema>;