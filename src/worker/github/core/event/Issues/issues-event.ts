import { PrismaClient } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { githubIssuesEventSchemaDto } from "./dto/github-issues-webhook.dto";
import { Class_methods_type } from "../../../types/class-methods-type";
import { PrismaService } from "../../../../../prisma/prisma.service";


export class Issues_event {
    private readonly prisma: PrismaClient
    constructor( prisma?: PrismaClient ) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async Issues_event(
        data: githubIssuesEventSchemaDto
    ): Promise<Class_methods_type> {
        try {
            const payload =  data.data;

            const issueActionHandlers: Partial<Record<githubIssuesEventSchemaDto["data"]["action"], () => Class_methods_type>> = {
                deleted: () => {
                    /**
                     * 
                     * handle here delete action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                assigned: () => {
                    /**
                     * 
                     * handle here assigned action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                closed: () => {
                    /**
                     * 
                     * handle here closed action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                demilestoned: () => {
                    /**
                     * 
                     * handle here demilestoned action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                edited: () => {
                    /**
                     * 
                     * handle here edited action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                labeled: () => {
                    /**
                     * 
                     * handle here labeled action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                locked: () => {
                    /**
                     * 
                     * handle here locked action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                milestoned: () => {
                    /**
                     * 
                     * handle here milestoned action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                pinned: () => {
                    /**
                     * 
                     * handle here pinned action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                reopened: () => {
                    /**
                     * 
                     * handle here reopened action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                transferred: () => {
                    /**
                     * 
                     * handle here transferred action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                typed: () => {
                    /**
                     * 
                     * handle here typed action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                unassigned: () => {
                    /**
                     * 
                     * handle here unassigned action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                unlabeled: () => {
                    /**
                     * 
                     * handle here unlabeled action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                unlocked: () => {
                    /**
                     * 
                     * handle here unlocked action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                unpinned: () => {
                    /**
                     * 
                     * handle here unpinned action
                     * 
                     */

                    return {
                        success: true
                    };
                },
                untyped: () => {
                    /**
                     * 
                     * handle here untyped action
                     * 
                     */

                    return {
                        success: true
                    };
                },
            };
            const issueActionHandler = issueActionHandlers[payload.action];

            if(issueActionHandler) {
                return issueActionHandler();
            }

            // find the github connection
            const githubUser = await this.prisma.githubConnection.findUnique({
                where: {
                    installationId: payload.installation.id
                },
                select: {
                    userId: true
                }
            });

            if(!githubUser || !githubUser.userId) {
                return {
                    success: true
                }
            }

            // Find workflow
            const workflow = await this.prisma.workflow.findFirst({
                where: {
                    userId: githubUser.userId,
                    platform: "GitHub",
                    enabled: true,
                    eventType: "issues",
                    action: "created"   
                },
                select: {
                    id: true
                }
            })

            if(!workflow) {
                return {
                    success: true
                }
            }

            // Find actions under this workflow
            const actions = await this.prisma.action.findMany({
                where: {
                    workflowId: workflow.id,
                    platform: "GitHub",
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

            // execute all the actions
            for (let i = 0; i < actions.length; i++) {
                
            }

            return {
                success: true
            };
        } catch (error) {
            return {
                success: false,
                message: "",
                allUpTo: false,
                requeue: true
            };
        }
    }
}

