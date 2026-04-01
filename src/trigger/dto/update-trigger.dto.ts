import { Platform, EventType, Prisma } from "@prisma/client";
import { z } from "zod";

export const updateTriggerSchema = z
  .object({
    platform: z.nativeEnum(Platform).optional(),
    eventType: z.nativeEnum(EventType).optional(),
    config: z.json().nullable().optional().transform((val) => {
      if (val === null) return Prisma.JsonNull;
      return val;
    })
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateTriggerDto = z.infer<typeof updateTriggerSchema>;
