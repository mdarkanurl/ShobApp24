import { EventType, Platform, Prisma } from "@prisma/client";
import { z } from "zod";

export const createTriggerSchema = z.object({
  platform: z.nativeEnum(Platform),
  eventType: z.nativeEnum(EventType),
  config: z.json().nullable().optional().transform((val) => {
    if (val === null) return Prisma.JsonNull;
    return val;
  })
});

export type CreateTriggerDto = z.infer<typeof createTriggerSchema>;
