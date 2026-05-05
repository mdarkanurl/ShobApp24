import { RunStatus } from "@prisma/client";
import { z } from "zod";

export const getAllWorkflowRunsSchema = z.object({
    page: z.coerce.number().int().default(1),
    limit: z.number().int().min(2).max(100).default(10),
    status: z.nativeEnum(RunStatus).optional()
});

export type GetAllWorkflowRunsSchemaDto = z.infer<typeof getAllWorkflowRunsSchema>;
