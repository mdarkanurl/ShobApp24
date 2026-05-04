import { ActionTypes, EventType, Platform, PrismaClient } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { JsonValue } from "@prisma/client/runtime/client";
import { Actions_function_type } from "../../types/actions-function-type";
import { EmailBodyResult } from "../../types/email-body-result.type";
import { ActionExecutionResult } from "../../types/actions-execution-result.type";
import { Class_methods_type } from "../../types/class-methods-type";
import { createActionDto, createActionSchemaByEventType } from "../../../../action/dto/create-action.dto";


export abstract class BaseEvent<TPayload> {
    protected readonly prisma: PrismaClient;
    protected abstract readonly eventType: EventType;
    
    constructor(prisma?: PrismaClient) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async findWorkflow(
        payload: {
            installationId: number;
            repoId: number;
            action: string | null;
        }
    ): Promise<{ id: string } | null> {
        const githubUser = await this.prisma.githubConnection.findFirst({
            where: {
                installationId: payload.installationId,
            },
            select: {
                id: true,
                userId: true,
            },
        });

        if (!githubUser?.userId) {
            return null;
        }

        return this.prisma.workflow.findFirst({
            where: {
                userId: githubUser.userId,
                platform: "GitHub",
                enabled: true,
                repo: {
                    repoId: payload.repoId,
                    GithubConnectionsId: githubUser.id
                },
                eventType: this.eventType,
                action: payload.action,
            },
            select: {
                id: true,
            },
        });
    }

    parseActionConfig(config: JsonValue): unknown {
        if (typeof config === "string") {
            return JSON.parse(config);
        }

        return config;
    }

    async buildEmailBody({
        body,
        includeViewerInfo,
        getViewerData,
    }: {
        body: string;
        includeViewerInfo?: boolean;
        getViewerData: () => Promise<Actions_function_type>;
    }): Promise<EmailBodyResult> {
        const sections = [body];

        if (includeViewerInfo) {
            const viewerData = await getViewerData();

            if (!viewerData.success) {
                return {
                    success: false,
                    message: viewerData.message,
                    error: viewerData.error ?? viewerData.message,
                };
            }

            sections.push(`Viewer info:\n${JSON.stringify(viewerData.data)}`);
        }

        return {
            success: true,
            body: sections.filter(Boolean).join("\n\n"),
        };
    }

    async executeActions({
        actions,
        workflowRunId,
        payload,
    }: {
        actions: Array<{
            id: string;
            type: ActionTypes;
            workflowId: string;
            platform: Platform;
            config: JsonValue;
            step: number;
            createdAt: Date;
        }>;
        workflowRunId: string;
        payload: TPayload;
    }): Promise<Class_methods_type> {
        const getViewerData = this.createViewerDataLoader(payload);

        for (const action of actions) {
            const actionRun = await this.prisma.actionRun.create({
                data: {
                    workflowRunId,
                    actionId: action.id,
                    status: "Running",
                    input: JSON.stringify(payload),
                },
                select: {
                    id: true,
                },
            });

            const parsedAction = createActionSchemaByEventType(this.eventType).safeParse({
                ...action,
                config: this.parseActionConfig(action.config),
            });

            if (!parsedAction.success) {
                await this.markActionRunFailed(actionRun.id, parsedAction.error.message);

                return {
                    success: false,
                    message: parsedAction.error.message,
                    allUpTo: false,
                    requeue: false,
                };
            }

            const executionResult = await this.executeSingleAction(parsedAction.data, payload, getViewerData);

            if (!executionResult.success) {
                await this.markActionRunFailed(actionRun.id, executionResult.error ?? executionResult.message);

                return {
                    success: false,
                    message: executionResult.message,
                    allUpTo: false,
                    requeue: executionResult.requeue ?? false,
                };
            }

            await this.prisma.actionRun.update({
                where: {
                    id: actionRun.id,
                },
                data: {
                    status: "Succeeded",
                    output: executionResult.output == null ? undefined : JSON.stringify(executionResult.output),
                    finishedAt: new Date(),
                },
            });
        }

        return {
            success: true,
        };
    }

    async buildWebhookPayload(
        payload: TPayload,
        getViewerData: () => Promise<Actions_function_type>,
    ): Promise<
        | { success: true; payload: unknown }
        | { success: false; message: string; error?: unknown; requeue?: boolean }
    > {

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
            payload: {
                trigger_payload: payload,
                viewer_info: viewerData.data,
            },
        };
    }

    async markActionRunFailed(actionRunId: string, error: unknown): Promise<void> {
        await this.prisma.actionRun.update({
            where: {
                id: actionRunId,
            },
            data: {
                status: "Failed",
                error: JSON.stringify(error),
                finishedAt: new Date(),
            },
        });
    }

    protected abstract createViewerDataLoader(
        payload: TPayload,
    ): () => Promise<Actions_function_type>;

    protected abstract executeSingleAction(
        action: createActionDto,
        payload: TPayload,
        getViewerData: () => Promise<Actions_function_type>,
    ): Promise<ActionExecutionResult>;
}
