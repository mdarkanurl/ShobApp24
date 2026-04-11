import { EventType, Platform, Prisma } from "@prisma/client";
import { z } from "zod";

export const createWorkflowSchema = z.object({
    name: z.string().min(1),
    platform: z.nativeEnum(Platform),

    eventType: z.nativeEnum(EventType),
    action: z.string().min(1).optional(),
      config: z.json().nullable().optional().transform((val) => {
        if (val === null) return Prisma.JsonNull;
        return val;
    }),

    resourceId: z.string().optional(),
    resourceType: z.string().optional()
}).refine((data) => data.platform === "GitHub" && data.action, {
    message: "You must specific the action"
});

export type createWorkflowSchemaDto = z.infer<typeof createWorkflowSchema>;
