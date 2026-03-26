import { ActionTypes, Platform, Prisma } from "@prisma/client";
import { z } from "zod";

export const createActionSchema = z.object({
    platform: z.nativeEnum(Platform),
    type: z.nativeEnum(ActionTypes),
    config: z.json().nullable().transform((val) => {
        if (val === null) return Prisma.JsonNull;
        return val;
    }),
    step: z.number()
});

export type createActionDto = z.infer<typeof createActionSchema>;
