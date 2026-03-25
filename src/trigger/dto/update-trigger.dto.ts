import { Platform } from "@prisma/client";
import { z } from "zod";

export const updateTriggerSchema = z
  .object({
    platform: z.nativeEnum(Platform).optional(),
    eventType: z.string().min(1).optional(),
    config: z.unknown().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateTriggerDto = z.infer<typeof updateTriggerSchema>;
