import { PrismaClient } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { githubStarEventSchemaDto } from "./dto/github-star-webhook.dto";
import { Class_methods_type } from "../../../types/class-methods-type";
import { PrismaService } from "../../../../../prisma/prisma.service";
import { sendEmail } from '../../../../../utils/rabbitmq';
import { createActionSchema } from "../../../../../action/dto/create-action.dto";
import { collect_viewer_info } from "../../actions";


export class Star_event {
    private readonly prisma: PrismaClient
    constructor( prisma?: PrismaClient ) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async Star_event(
        dataset: githubStarEventSchemaDto
    ): Promise<Class_methods_type> {
        try {
            const payload = dataset.data;
            
            if(payload.action === "deleted") {

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
                        enabled: true,
                        eventType: "star",
                        action: "deleted",
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

                // Find all the actions
                const actions = await this.prisma.action.findMany({
                    where: {
                        workflowId: workflow.id,
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
                    enabled: true,
                    eventType: "star",
                    action: "created",
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

            // Find all the actions
            const actions = await this.prisma.action.findMany({
                where: {
                    workflowId: workflow.id,
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
                const { success, data, error } = createActionSchema.safeParse(actions[i]);

                if(!success) {
                    return {
                        success: false,
                        message: error.message,
                        allUpTo: false,
                        requeue: false
                    }
                }

                const actionType = data.type;
                if(actionType === "send_email" && data.config.do_you_wanto_to_send_viewer_info) {
                    // Collect viewer info
                    const userData = await collect_viewer_info({
                        senderUrl: payload.sender.url,
                        senderOrganizationsUrl: payload.sender.organizations_url
                    });

                    // Send email
                    await sendEmail({
                        email: data.config.email,
                        subject: data.config.subject,
                        body: `${data.config.body}\n\nHere's the viewer info:\n${JSON.stringify(userData)}`
                    });

                    return {
                        success: true
                    };
                } else if(actionType === "send_email") {
                    await sendEmail({
                        email: data.config.email,
                        subject: data.config.subject,
                        body: data.config.body
                    });

                    return {
                        success: true
                    };
                }

                if(actionType === "send_email_to_me" && data.config.do_you_want_viewer_info) {
                    // Collect viewer info
                    const userData = await collect_viewer_info({
                        senderUrl: payload.sender.url,
                        senderOrganizationsUrl: payload.sender.organizations_url
                    });

                    // Send email
                    await sendEmail({
                        email: data.config.email,
                        subject: data.config.subject || "",
                        body: `${data.config.body}\n\nHere's the viewer info:\n${JSON.stringify(userData)}`
                    });

                    return {
                        success: true
                    };
                } else if(actionType === "send_email_to_me") {
                    await sendEmail({
                        email: data.config.email,
                        subject: data.config.subject || "",
                        body: data.config.body || ""
                    });

                    return {
                        success: true
                    };
                }

                if(actionType === "send_email_to_who_send_the_trigger") {
                    const userData = await collect_viewer_info({
                        senderUrl: payload.sender.url,
                        senderOrganizationsUrl: payload.sender.organizations_url
                    });

                    await sendEmail({
                        email: userData.email,
                        subject: data.config.subject || "",
                        body: data.config.body
                    });
                    
                    return {
                        success: true
                    };
                }

                if(actionType === "webhook") {
                    const userData = await collect_viewer_info({
                        senderUrl: payload.sender.url,
                        senderOrganizationsUrl: payload.sender.organizations_url
                    });

                    await fetch(data.config.url, {
                        method: 'POST',
                        headers: {
                            'User-Agent': 'ShobApp24-webhook',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(userData),
                    });

                    return {
                        success: true
                    };
                }

                if(actionType === "send_telegram") {
                    // TODO send telegram message
                }
            }

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

