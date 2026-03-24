import { Platform } from "@prisma/client";
import { z } from "zod";

export const createWorkflowSchema = z.object({
    name: z.string().min(1),
    platform: z.nativeEnum(Platform),

    resourceId: z.string().optional(),
    resourceType: z.string().optional()
});

export type createWorkflowSchemaDto = z.infer<typeof createWorkflowSchema>;