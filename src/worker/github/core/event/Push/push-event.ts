import { PrismaClient } from "@prisma/client";
import { githubPushEventSchemaDto } from "./dto/github-push-webhook.dto";
import { Class_methods_type } from "../../../types/class-methods-type";
import { sendEmail } from "../../../../../utils/rabbitmq";
import { createActionDto } from "../../../../../action/dto/create-action.dto";
import { collect_viewer_info } from "../../actions";
import { Actions_function_type } from "../../../types/actions-function-type";
import { ActionExecutionResult } from "../../../types/actions-execution-result.type";
import { BaseEvent } from "../base-event";
import { AI_analytics_for_push_event } from "../../actions/ai_analytics_for_push_event";

type PushEventDataset = {
    event: "push";
    data: PushPayload;
};

type PushPayload = githubPushEventSchemaDto["data"];

export class Push_event extends BaseEvent<PushPayload> {
    protected readonly eventType = "push" as const;

    constructor(prisma?: PrismaClient) {
        super(prisma);
    }

    async Push_event(dataset: PushEventDataset): Promise<Class_methods_type> {
        const payload = dataset.data;
        let workflowRun: { id: string } | null = null;

        try {
            const workflow = await this.findWorkflow({
                installationId: payload.installation.id,
                repoId: payload.repository.id,
                action: null,
            });

            if (!workflow) {
                return { success: true };
            }

            const actions = await this.prisma.action.findMany({
                where: {
                    workflowId: workflow.id,
                },
                orderBy: {
                    step: "asc",
                },
            });

            if (!actions.length) {
                return { success: true };
            }

            workflowRun = await this.prisma.workflowRun.create({
                data: {
                    workflowId: workflow.id,
                    platform: "GitHub",
                    eventType: "push",
                    payload: JSON.stringify(payload),
                    status: "Running",
                },
                select: {
                    id: true,
                },
            });

            const executionResult = await this.executeActions({
                actions,
                workflowRunId: workflowRun.id,
                payload,
            });

            await this.prisma.workflowRun.update({
                where: {
                    id: workflowRun.id,
                },
                data: {
                    status: executionResult.success ? "Succeeded" : "Failed",
                    output: executionResult.success ? undefined : JSON.stringify(executionResult.message),
                    finishedAt: new Date(),
                },
            });

            return executionResult;
        } catch (error) {
            if (workflowRun?.id) {
                await this.prisma.workflowRun.update({
                    where: {
                        id: workflowRun.id,
                    },
                    data: {
                        status: "Failed",
                        output: JSON.stringify(error),
                        finishedAt: new Date(),
                    },
                });
            }

            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to process GitHub push event",
                allUpTo: false,
                requeue: true,
            };
        }
    }

    protected async executeSingleAction(
        action: createActionDto,
        payload: PushPayload,
        getViewerData: () => Promise<Actions_function_type>,
    ): Promise<ActionExecutionResult> {
        try {
            if (action.type === "send_email") {
                const sections: string[] = [action.config.body!];

                if ("do_you_want_to_send_push_info" in action.config) {
                    sections.push(`Push info:\n${JSON.stringify(payload)}`);
                }

                if ("do_you_want_AI_analytics_of_push_data" in action.config) {
                    const analytics = await AI_analytics_for_push_event();

                    if (!analytics.success) {
                        return {
                            success: false,
                            message: analytics.message,
                            error: analytics.error ?? analytics.message,
                        };
                    }

                    sections.push(`AI analytics:\n${analytics.data}`);
                }

                await sendEmail({
                    email: action.config.email,
                    subject: action.config.subject!,
                    body: sections.filter(Boolean).join("\n\n"),
                });

                return {
                    success: true,
                    output: { custom_message: "The data is added to the queue." },
                };
            }

            if(action.type === "send_email_to_me") {
                const sections: string[] = [action.config.body!];

                // TODO send here important data, not all data
                if ("do_you_want_push_info" in action.config) {
                    sections.push(`Push info:\n${JSON.stringify(payload)}`);
                }

                if ("do_you_want_AI_analytics_of_push_data" in action.config) {
                    const analytics = await AI_analytics_for_push_event();

                    if (!analytics.success) {
                        return {
                            success: false,
                            message: analytics.message,
                            error: analytics.error ?? analytics.message,
                        };
                    }

                    sections.push(`AI analytics:\n${analytics.data}`);
                }

                await sendEmail({
                    email: action.config.email,
                    subject: action.config.subject!,
                    body: sections.filter(Boolean).join("\n\n"),
                });

                return {
                    success: true,
                    output: { custom_message: "The data is added to the queue." },
                };
            }

            if (action.type === "send_email_to_who_push_the_commit") {
                const pusherEmail: string = payload.pusher.email;

                if (!pusherEmail) {
                    return {
                        success: false,
                        message: "pusher email doesn't exist",
                        error: null,
                    };
                }

                const body = action.config.do_you_want_AI_analytics_of_push_data?
                    await AI_analytics_for_push_event(): { success: true, data: action.config.body! };

                if(typeof body !== "string" && !body.success) {
                    return {
                        success: false,
                        message: "pusher email doesn't exist",
                        error: null,
                    };
                }

                await sendEmail({
                    email: pusherEmail,
                    subject: action.config.subject || "",
                    body: typeof body !== "string"? body.data : body,
                });

                return {
                    success: true,
                    output: { custom_message: "The data is added to the queue." },
                };
            }

            if (action.type === "webhook") {

                const res = await fetch(action.config.url, {
                    method: "POST",
                    headers: {
                        "User-Agent": "ShobApp24-webhook",
                        "Content-Type": "application/json",
                    },
                    // TODO send here important data, not all data
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    return {
                        success: false,
                        message: `Webhook returned ${res.status}`,
                        error: await res.text(),
                        requeue: false,
                    };
                }

                const contentType = res.headers.get("content-type") || "";
                const output = contentType.includes("application/json")
                    ? await res.json()
                    : await res.text();

                return {
                    success: true,
                    output,
                };
            }

            if (action.type === "send_telegram") {
                return {
                    success: false,
                    message: "send_telegram action is not implemented yet",
                    requeue: false,
                };
            }

            const unsupportedAction = action.type;

            return {
                success: false,
                message: `Unsupported action type: ${String(unsupportedAction)}`,
                requeue: false,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Action execution failed",
                error,
                requeue: true,
            };
        }
    }

    protected createViewerDataLoader(payload: PushPayload): () => Promise<Actions_function_type> {
        let viewerData: Actions_function_type | null = null;

        return async (): Promise<Actions_function_type> => {
            if (!viewerData) {
                viewerData = await collect_viewer_info({
                    senderUrl: payload.sender.url,
                    senderOrganizationsUrl: payload.sender.organizations_url,
                });
            }

            return viewerData;
        };
    }
}
