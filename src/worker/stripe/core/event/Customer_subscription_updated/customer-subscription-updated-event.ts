import { PrismaClient } from "@prisma/client";
import { Class_methods_type } from "../../../types/class-methods-type";
import { PrismaService } from "../../../../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

export class Customer_subscription_updated_event {
    protected readonly prisma: PrismaClient;
    
    constructor(prisma?: PrismaClient) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async Customer_subscription_updated_event(
        payload: any
    ): Promise<Class_methods_type> {
        try {
            await this.prisma.subscriptions.update({
                where: {
                    stripeSubscriptionId: payload.data.data.object.id
                },
                data: {
                    stripePriceId: payload.data.data.object.plan.id,
                    plan: payload.data.data.object.metadata.plan,
                    currentPeriodStart: payload.data.data.object.items.data[0].current_period_start,
                    currentPeriodEnd: payload.data.data.object.items.data[0].current_period_end,
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
                requeue: false
            };
        }
    }
}
