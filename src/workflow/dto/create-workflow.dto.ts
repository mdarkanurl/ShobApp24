import { EventType, Platform, Prisma } from "@prisma/client";
import { z } from "zod";
import { getGitHubWorkflowActions } from "../github-workflow-action-rules";

export const createWorkflowSchema = z.object({
    name: z.string().min(1),
    platform: z.nativeEnum(Platform),

    repoId: z.string().trim(),
    eventType: z.nativeEnum(EventType),
    action: z.string().trim(),
    config: z.json().nullable().optional().transform((val) => {
        if (val === null) return Prisma.JsonNull;
        return val;
    }),
}).superRefine((data, ctx) => {

    if (data.platform !== "GitHub") {
        return;
    }

    if (!data.action) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["action"],
            message: `Action is required for GitHub ${data.eventType} event`,
        });
        return;
    }

    const allowedActions = getGitHubWorkflowActions(data.eventType);

    if (allowedActions.length === 0) {
        if (data.action) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["action"],
                message: `Action is not allowed for GitHub ${data.eventType} event`,
            });
        }
        return;
    }

    if (!allowedActions.includes(data.action)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["action"],
            message: `Action must be one of: ${allowedActions.join(", ")}`,
        });
    }
});

export type createWorkflowSchemaDto = z.infer<typeof createWorkflowSchema>;

