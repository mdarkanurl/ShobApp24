import { Platform, PrismaClient } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { githubStarEventSchemaDto } from "./dto/github-star-webhook.dto";
import { Class_methods_type } from "../../../types/class-methods-type";
import { PrismaService } from "../../../../../prisma/prisma.service";


export class Star_event {
    private readonly prisma: PrismaClient
    constructor( prisma?: PrismaClient ) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async Star_event(
        data: githubStarEventSchemaDto
    ): Promise<Class_methods_type> {
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

            // Find the github connection
            const githubUser = await this.prisma.githubConnection.findFirst({
                where: {
                    GitHubAccountId: payload.repository.owner.id
                },
                select: {
                    userId: true,
                }
            });

            if(!githubUser || !githubUser.userId) {
                return {
                    success: true
                }
            }

            // Find the workflow
            const workflow = await this.prisma.workflow.findFirst({
                where: {
                    userId: githubUser.userId,
                    platform: "GitHub",
                    enabled: true
                },
                select: {
                    id: true
                }
            });

            if(!workflow) {
                return {
                    success: true
                }
            }

            // Find the trigger
            const trigger = await this.prisma.trigger.findFirst({
                where: {
                    workflowId: workflow.id,
                    platform: Platform.GitHub,
                    eventType: "star",
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

