import {
    githubInstallationEventSchemaDto,
} from "./dto/github-installation-webhook.dto";
import { EventType, Platform, PrismaClient } from '@prisma/client';
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { processDataType } from "./types/process-data-type";
import { githubStarEventSchemaDto } from "./dto/github-star-webhook.dto";


export class ProcessGitHubWebhookData {
    private readonly prisma: PrismaClient
    constructor( prisma?: PrismaClient ) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async Installation_event(
        payload: githubInstallationEventSchemaDto
    ): Promise<processDataType> {
        try {
            // TODO write logic for when user select a repo instead of all the repos
            const GitHubAccountId = payload.data.installation.account.id

            if (payload.data.action === "deleted") {
                /**
                 * 
                 * handle here delete action
                 * 
                 */

               return {
                    success: true
                };
            }

            if (payload.data.action === "new_permissions_accepted") {
                /**
                 * 
                 * handle here new_permissions_accepted action
                 * 
                 */

               return {
                    success: true
                };
            }

            if (payload.data.action === "suspend") {
                /**
                 * 
                 * handle here suspend action
                 * 
                 */

               return {
                    success: true
                };
            }

            if (payload.data.action === "unsuspend") {
                /**
                 * 
                 * handle here unsuspend action
                 * 
                 */

               return {
                    success: true
                };
            }

            if (payload.data.action !== "created") {
                console.log(`Unknown installation action: ${payload.data.action}`);
                return {
                    success: true
                };
            }

            await this.prisma.$transaction(async (tx) => {
                const githubConnection = await tx.githubConnection.create({
                    data: {
                        installationId: payload.data.installation.id,
                        username: payload.data.installation.account.login,
                        url: payload.data.installation.account.url,
                        html_url: payload.data.installation.account.html_url,
                        avatar_url: payload.data.installation.account.avatar_url,
                        type: payload.data.installation.account.type,
                        repos_url: payload.data.installation.account.repos_url,
                        GitHubAccountId,
                    }
                });

                const repositories = payload.data.repositories.map((repository) => ({
                    GithubConnectionsId: githubConnection.id,
                    repoId: repository.id,
                    name: repository.name,
                    full_name: repository.full_name,
                    private: repository.private,
                }));

                if (repositories.length > 0) {
                    await tx.gitHubRepo.createMany({
                        data: repositories,
                        skipDuplicates: true,
                    });
                }
            });

            return {
                success: true
            };
        } catch (error) {
            console.error(error);
            return {
                success: false,
                message: "",
                allUpTo: false,
                requeue: true
            };
        }
    }

    async Star_event(
        data: githubStarEventSchemaDto
    ): Promise<processDataType> {
        try {
            const payload = data.data;
            
            if(payload.action === "deleted") {
                /**
                 * 
                 * handle here delete action
                 * 
                 */

               return {
                    success: true
                };
            }

            // Find the workflow
            const workflow = await this.prisma.githubConnection.findFirst({
                where: {
                    GitHubAccountId: payload.repository.owner.id
                },
                select: {
                    id: true,
                    userId: true,
                }
            });

            if(!workflow || !workflow.userId) {
                return {
                    success: true
                }
            }

            const trigger = await this.prisma.trigger.findFirst({
                where: {
                    eventType: EventType.star,
                    userId: workflow.userId,
                    workflowId: workflow.id,
                    platform: Platform.GitHub
                },
                select: {
                    id: true
                }
            });

            if(!trigger) {
                return {
                    success: true
                }
            }

            // Find all the actions
            const actions = await this.prisma.action.findMany({
                where: {
                    userId: workflow.userId,
                    workflowId: workflow.id,
                    platform: Platform.GitHub
                },
                orderBy: {
                    step: "asc"
                }
            });

            if(!actions.length) {
                return {
                    success: true
                }
            }

            // TODO write logic for execute actions

            return {
                success: true
            }
        } catch (error) {
            console.error(error);
            return {
                success: false,
                message: "",
                allUpTo: false,
                requeue: true
            };
        }
    }
}
