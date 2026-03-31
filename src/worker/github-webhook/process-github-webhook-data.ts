import {
    githubInstallationEventSchemaDto,
} from "./dto/github-installation-webhook.dto";
import { PrismaClient } from '@prisma/client';
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { processDataType } from "./types/process-data-type";


export class ProcessGitHubWebhookData {
    private readonly prisma: PrismaClient
    constructor( prisma?: PrismaClient ) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async Installation_event(
        data: githubInstallationEventSchemaDto
    ): Promise<processDataType> {
        try {
            const payload = data;
            const installationId = payload.data.installation.id;

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

            if (payload.data.action !== "created") {
                console.log(`Ignoring installation action: ${payload.data.action}`);
                return {
                    success: true
                };
            }

            await this.prisma.$transaction(async (tx) => {
                const githubConnection = await tx.githubConnection.create({
                    data: {
                        installationId,
                        username: payload.data.installation.account.login,
                        url: payload.data.installation.account.url,
                        html_url: payload.data.installation.account.html_url,
                        avatar_url: payload.data.installation.account.avatar_url,
                        type: payload.data.installation.account.type,
                        repos_url: payload.data.installation.account.repos_url,
                        GitHubAccountId: payload.data.installation.account.id,
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
}
