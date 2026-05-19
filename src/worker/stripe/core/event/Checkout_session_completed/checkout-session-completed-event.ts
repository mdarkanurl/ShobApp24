import { PrismaClient } from '@prisma/client';
import { Class_methods_type } from "../../../types/class-methods-type";
import { PrismaService } from "../../../../../prisma/prisma.service";
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { sendEmail } from '../../../../../utils/rabbitmq';

export class Checkout_session_completed_event {
    protected readonly prisma: PrismaClient;

    constructor(prisma?: PrismaClient) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async Checkout_session_completed_event(
        payload: any
    ): Promise<Class_methods_type> {
        try {
            try {
                await this.prisma.subscriptions.create({
                    data: {
                        userId: payload.data.data.object.metadata.userId,
                        stripeCustomerId: payload.data.data.object.client_reference_id,
                        stripeSubscriptionId: payload.data.data.object.subscription,
                        stripePriceId: payload.data.data.object.metadata.priceId,
                        status: "active",
                        currentPeriodEnd: payload.data.data.object.expires_at
                    }
                });
            } catch (error) {
                if(error instanceof PrismaClientKnownRequestError
                    && error.code === "P2002"
                ) {
                    return {
                        success: true
                    };
                }

                console.error(error);
                return {
                    success: false,
                    message: "",
                    allUpTo: false,
                    requeue: false
                };
            }

            // Get the user email from our DB
            const user = await this.prisma.user.findUnique({
                where: {
                    id: payload.data.data.object.metadata.userId
                },
                select: {
                    email: true
                }
            });
            
            // Send confirmation email
            sendEmail({
                email: user?.email!,
                subject: `You have successfully subscribe to ${payload.data.data.object.metadata.plan} plan`,
                body: `You have successfully subscribe to ${payload.data.data.object.metadata.plan} plan`,
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
                requeue: false
            };
        }
    }
}
