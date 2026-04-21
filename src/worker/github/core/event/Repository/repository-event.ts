import { PrismaClient } from "@prisma/client";
import { GithubRepositoryWebhookDto } from "./dto/github-repository-webhook.dto";
import { Class_methods_type } from "../../../types/class-methods-type";
import { sendEmail } from "../../../../../utils/rabbitmq";
import { createActionDto } from "../../../../../action/dto/create-action.dto";
import { collect_viewer_info } from "../../actions";
import { Actions_function_type } from "../../../types/actions-function-type";
import { ActionExecutionResult } from "../../../types/actions-execution-result.type";
import { BaseEvent } from "../base-event";

type RepositoryEventDataset = {
    event: "repository";
    data: RepositoryPayload;
};

type RepositoryPayload = GithubRepositoryWebhookDto["data"];

export class Repository_event extends BaseEvent<RepositoryPayload> {
    protected readonly eventType = "repository" as const;

    constructor(prisma?: PrismaClient) {
        super(prisma);
    }

    async Repository_event(dataset: RepositoryEventDataset): Promise<Class_methods_type> {
        const payload = dataset.data;
        let workflowRun: { id: string } | null = null;

        try {
            // Checks event action
            const action = payload.action;

            // Find the github connection
            const githubConnectionsId = await this.prisma.githubConnection.findFirst({
                where: {
                    installationId: payload.installation.id
                },
                select: {
                    id: true
                }
            });

            if(!githubConnectionsId) {
                return { success: true }
            }

            const upsertRepo = async () => {
                await this.prisma.gitHubRepo.upsert({
                    where: {
                        repoId: payload.repository.id,
                    },
                    create: {
                        GithubConnectionsId: githubConnectionsId.id,
                        repoId: payload.repository.id,
                        name: payload.repository.name,
                        full_name: payload.repository.full_name,
                        private: payload.repository.private,
                    },
                    update: {
                        GithubConnectionsId: githubConnectionsId.id,
                        name: payload.repository.name,
                        full_name: payload.repository.full_name,
                        private: payload.repository.private,
                    },
                });
            };

            switch (action) {
                case "created":
                    // insert repo data to our DB (or refresh if already present)
                    await upsertRepo();
                    break;

                case "deleted":
                    // delete repo data from our DB
                    // TODO add here soft delete functionality
                    await this.prisma.gitHubRepo.deleteMany({
                        where: {
                            repoId: payload.repository.id
                        }
                    });
                    break;

                case "edited":
                    // keep stored fields in sync (name/full_name/private)
                    await upsertRepo();
                    break;

                case "renamed":
                    // payload.repository contains updated name/full_name
                    await upsertRepo();
                    break;

                case "publicized":
                    // payload.repository.private should now be false
                    await upsertRepo();
                    break;

                case "privatized":
                    // payload.repository.private should now be true
                    await upsertRepo();
                    break;

                case "archived":
                    // we don't currently store archived state
                    await upsertRepo();
                    break;

                case "transferred":
                    // Repository ownership was transferred to a new user or organization.
                    // This event is sent only to the new owner, who must have the GitHub App installed and subscribed to “Repository” events to receive it.
                    // TODO delete the repo from our DB
                    await upsertRepo();
                    break;

                case "unarchived":
                    // we don't currently store archived state
                    await upsertRepo();
                    break;
            
                default:
                    break;
            }

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
                    eventType: "repository",
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
                message: error instanceof Error ? error.message : "Failed to process GitHub repository event",
                allUpTo: false,
                requeue: true,
            };
        }
    }

    protected async executeSingleAction(
        action: createActionDto,
        payload: RepositoryPayload,
        getViewerData: () => Promise<Actions_function_type>,
    ): Promise<ActionExecutionResult> {
        try {

            if (action.type === "send_email") {
                const body = await this.buildEmailBody({
                    body: action.config.body || "",
                    includeViewerInfo: false,
                    getViewerData,
                });

                if (body.success === false) {
                    return body;
                }

                await sendEmail({
                    email: action.config.email,
                    subject: action.config.subject || "",
                    body: body.body,
                });

                return {
                    success: true,
                    output: { custom_message: "The data is added to the queue." },
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

    protected createViewerDataLoader(payload: RepositoryPayload): () => Promise<Actions_function_type> {
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
