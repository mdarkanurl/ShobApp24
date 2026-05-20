import { PrismaClient } from "@prisma/client";
import { Class_methods_type } from "../../../types/class-methods-type";
import { PrismaService } from "../../../../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

export class Invoice_payment_failed_event {
    protected readonly prisma: PrismaClient;
        
    constructor(prisma?: PrismaClient) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async Invoice_payment_failed_event(
        payload: any
    ): Promise<Class_methods_type> {
        const data = payload.data;
        try {
            const subscription = await this.prisma.subscriptions.upsert({
                create: {
                    stripeSubscriptionId: data.data.object.parent.subscription_details.subscription,
                    currentPeriodStart: data.data.object.period_start,
                    currentPeriodEnd: data.data.object.period_start,
                    status: "unpaid"
                },
                update: {
                    currentPeriodStart: data.data.object.period_start,
                    currentPeriodEnd: data.data.object.period_end,
                    status: "unpaid"
                },
                where: {
                    stripeSubscriptionId: data.data.object.parent.subscription_details.subscription
                },
                select: {
                    id: true
                }
            });

            // insert data to payments table
            await this.prisma.payments.create({
                data: {
                    localSubscriptionId: subscription.id,
                    stripeInvoiceId: data.data.object.id,
                    stripeSubscriptionId: data.data.object.parent.subscription_details.subscription,
                    amount: data.data.object.amount_paid,
                    currency: data.data.object.currency,
                    status: "payment_failed",
                    paidAt: data.data.object.created
                }
            });
            
            //  TODO send confirmation email
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
