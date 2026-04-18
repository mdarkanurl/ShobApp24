import { PrismaClient } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { Class_methods_type } from "../../../types/class-methods-type";
import { githubInstallationEventSchemaDto } from "./dto/github-installation-webhook.dto";
import { PrismaService } from "../../../../../prisma/prisma.service";


export class Installation_event{
    private readonly prisma: PrismaClient
    constructor( prisma?: PrismaClient ) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async Installation_event(
            payload: githubInstallationEventSchemaDto
        ): Promise<Class_methods_type> {
            try {
                // TODO write logic for when user select a repo instead of all the repos
                const GitHubAccountId = payload.data.installation.account.id;

                switch (payload.data.action) {
                    case "created":
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
                                },
                                select: {
                                    id: true
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
                        break;

                    case "deleted":
                        // handle here delete action
                        await this.prisma.$transaction(async (tx) => {
                            const githubConnection = await tx.githubConnection.delete({
                                where: {
                                    installationId: payload.data.installation.id,
                                    GitHubAccountId,
                                },
                                select: {
                                    id: true
                                }
                            });
            
                            await tx.gitHubRepo.deleteMany({
                                where: {
                                    GithubConnectionsId: githubConnection.id
                                }
                            });
                        });
                        break;

                    case "new_permissions_accepted":
                        // handle here new_permissions_accepted action
                        break;

                    case "suspend":
                        // handle here suspend action
                        break;

                    case "unsuspend":
                        // handle here unsuspend action
                        break;
                    
                
                    default:
                        console.log(`Unknown installation action: ${payload.data.action}`);
                        break;
                }
    
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

