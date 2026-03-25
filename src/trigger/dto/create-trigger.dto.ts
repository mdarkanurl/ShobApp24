import { Platform, Prisma } from "@prisma/client";
import { z } from "zod";

export const createTriggerSchema = z.object({
  platform: z.nativeEnum(Platform),
  eventType: z.string().min(1),
  config: z.json().nullable().optional().transform((val) => {
    if (val === null) return Prisma.JsonNull;
    return val;
  })
});

export type CreateTriggerDto = z.infer<typeof createTriggerSchema>;
