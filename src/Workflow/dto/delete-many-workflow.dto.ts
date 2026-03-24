import { z } from "zod";

export const deleteManyWorkflowSchema = z.object({
  ids: z.array(z.string().min(1)).min(2).max(100)
}).strict().refine(
  ({ ids }) => new Set(ids).size === ids.length,
  {
    message: "Workflow ids must be unique",
    path: ["ids"]
  }
);

export type deleteManyWorkflowSchemaDto = z.infer<typeof deleteManyWorkflowSchema>;
