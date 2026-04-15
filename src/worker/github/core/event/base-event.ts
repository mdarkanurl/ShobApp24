import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { JsonValue } from "@prisma/client/runtime/client";
import { Actions_function_type } from "../../types/actions-function-type";
import { ForkWebhookSchemaDto } from "./Fork/dto/github-fork-webhook.dto";
import { githubStarEventSchemaDto } from "./Star/dto/github-star-webhook.dto";
import { EmailBodyResult } from "../../types/email-body-result.type";


export class BashEvent {
    protected readonly prisma: PrismaClient;
    
    constructor(prisma?: PrismaClient) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async findWorkflow(payload: { installationId: number, repoId: number, action: string }): Promise<{ id: string } | null> {
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
                eventType: "issues",
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
        includeViewerInfo: boolean;
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

    async buildWebhookPayload(
        payload: any,
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
}

