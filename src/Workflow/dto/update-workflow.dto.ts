import { z } from "zod";

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional()
}).refine((data) => Object.values(data).some((value) => value !== undefined), {
  message: "At least one field must be provided"
});

export type updateWorkflowSchemaDto = z.infer<typeof updateWorkflowSchema>;
