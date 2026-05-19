import { PrismaClient } from '@prisma/client';
import { Class_methods_type } from "../../../types/class-methods-type";
import { PrismaService } from "../../../../../prisma/prisma.service";
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

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
                await this.prisma.subscriptions.upsert({
                    create: {
                        userId: payload.data.data.object.metadata.userId,
                        stripeCustomerId: payload.data.data.object.client_reference_id,
                        stripeSubscriptionId: payload.data.data.object.subscription,
                        stripePriceId: payload.data.data.object.metadata.priceId,
                        status: "incomplete",
                    },
                    update: {
                        userId: payload.data.data.object.metadata.userId,
                        stripeCustomerId: payload.data.data.object.client_reference_id,
                        stripePriceId: payload.data.data.object.metadata.priceId,
                    },
                    where: {
                        stripeSubscriptionId: payload.data.data.object.subscription,
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
