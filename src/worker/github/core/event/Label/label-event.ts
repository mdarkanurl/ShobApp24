import { PrismaClient } from "@prisma/client";
import { GitHubLabelWebhook } from "./dto/github-label-webhook.dto";
import { Class_methods_type } from "../../../types/class-methods-type";
import { sendEmail } from "../../../../../utils/rabbitmq";
import { createActionDto } from "../../../../../action/dto/create-action.dto";
import { collect_viewer_email, collect_viewer_info } from "../../actions";
import { Actions_function_type } from "../../../types/actions-function-type";
import { ActionExecutionResult } from "../../../types/actions-execution-result.type";
import { BaseEvent } from "../base-event";

type LabelEventDataset = {
    event: "label";
    data: LabelPayload;
};

type LabelPayload = GitHubLabelWebhook;

export class Label_event extends BaseEvent<LabelPayload> {
    protected readonly eventType = "label" as const;

    constructor(prisma?: PrismaClient) {
        super(prisma);
    }

    async Label_event(dataset: LabelEventDataset): Promise<Class_methods_type> {
        const payload = dataset.data;
        let workflowRun: { id: string } | null = null;

        try {
            const workflow = await this.findWorkflow({
                installationId: payload.installation.id,
                repoId: payload.repository.id,
                action: payload.action,
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
                    eventType: "label",
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
                message: error instanceof Error ? error.message : "Failed to process GitHub label event",
                allUpTo: false,
                requeue: true,
            };
        }
    }

    protected async executeSingleAction(
        action: createActionDto,
        payload: LabelPayload,
        getViewerData: () => Promise<Actions_function_type>,
    ): Promise<ActionExecutionResult> {
        try {
            if (action.type === "collect_viewer_data") {
                const viewerData = await getViewerData();

                if (!viewerData.success) {
                    return {
                        success: false,
                        message: viewerData.message,
                        error: viewerData.error ?? viewerData.message,
                    };
                }

                return {
                    success: true,
                    output: viewerData.data,
                };
            }

            if (action.type === "send_email") {
                const body = await this.buildEmailBody({
                    body: action.config.body!,
                    includeViewerInfo: "do_you_want_push_info" in action.config ? true : false,
                    getViewerData,
                });

                if (body.success === false) {
                    return body;
                }

                await sendEmail({
                    email: action.config.email,
                    subject: action.config.subject!,
                    body: body.body,
                });

                return {
                    success: true,
                    output: { custom_message: "The data is added to the queue." },
                };
            }

            if (action.type === "send_email_to_me") {
                const body = await this.buildEmailBody({
                    body: action.config.body || "",
                    includeViewerInfo: "do_you_want_push_info" in action.config ? true : false,
                    getViewerData,
                });

                if (body.success === false) {
                    return body;
                }

                
                if("email" in action.config) {
                    await sendEmail({
                        email: action.config.email as string,
                        subject: action.config.subject,
                        body: body.body,
                    });

                    return {
                        success: true,
                        output: { custom_message: "The data is added to the queue." },
                    };
                }

                return {
                    success: false,
                    message: "user's data not found",
                };
            }

            if (action.type === "send_email_to_who_send_the_trigger") {
                const userEmail = await collect_viewer_email(payload.sender.html_url);

                if (!userEmail.success) {
                    return {
                        success: false,
                        message: userEmail.message,
                        error: userEmail.error ?? userEmail.message,
                    };
                }

                await sendEmail({
                    email: userEmail.data,
                    subject: action.config.subject || "",
                    body: action.config.body,
                });

                return {
                    success: true,
                    output: { custom_message: "The data is added to the queue." },
                };
            }

            if (action.type === "webhook") {
                const webhookPayload = await this.buildWebhookPayload(payload, getViewerData);

                if (webhookPayload.success === false) {
                    return webhookPayload;
                }

                const res = await fetch(action.config.url, {
                    method: "POST",
                    headers: {
                        "User-Agent": "ShobApp24-webhook",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(webhookPayload.payload),
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
                    success: true,
                };
            }

            return {
                success: true,
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

    protected createViewerDataLoader(payload: LabelPayload): () => Promise<Actions_function_type> {
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
