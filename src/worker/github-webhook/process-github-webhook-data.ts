import { githubInstallationEventSchemaDto } from "./dto/github-installation-webhook.dto";
import { PrismaClient } from '@prisma/client';
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";


export class ProcessGitHubWebhookData {
    private readonly prisma: PrismaClient
    constructor( prisma?: PrismaClient ) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async Installation_event(
        data: githubInstallationEventSchemaDto
    ): Promise<Boolean> {
        try {
            if(data.data.action === "created") {
                // wait 2 second to finish work of callback
                await new Promise((res, rej) => setTimeout(res, 2000));

                await this.prisma.githubConnection
                .update({
                    where: {
                        installationId: data.data.installation.id
                    },
                    data: {
                        username: data.data.installation.account.login,
                        url: data.data.installation.account.url,
                        html_url: data.data.installation.account.html_url,
                        avatar_url: data.data.installation.account.avatar_url,
                        type: data.data.installation.account.type,
                        repos_url: data.data.installation.account.repos_url,
                        GitHubAccountId: data.data.installation.account.id
                    }
                });

                return true;
            } else {
                console.log("Nothing happend!");
                return false;
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}
