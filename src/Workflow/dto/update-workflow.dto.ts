import { EventType, Platform, Prisma } from "@prisma/client";
import { z } from "zod";

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  
  platform: z.nativeEnum(Platform).optional(),
  eventType: z.nativeEnum(EventType).optional(),
  config: z.json().nullable().optional().transform((val) => {
    if (val === null) return Prisma.JsonNull;
    return val;
  })
}).refine((data) => Object.values(data).some((value) => value !== undefined), {
  message: "At least one field must be provided"
});

export type updateWorkflowSchemaDto = z.infer<typeof updateWorkflowSchema>;
