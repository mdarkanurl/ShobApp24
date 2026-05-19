import { PrismaClient } from "@prisma/client";
import { Class_methods_type } from "../../../types/class-methods-type";
import { PrismaService } from "../../../../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { InvoicePaidEvent } from "./dto/invoice_paid.dto";

export class Invoice_paid_event {
    protected readonly prisma: PrismaClient;
    
    constructor(prisma?: PrismaClient) {
        this.prisma = prisma ?? new PrismaService(new ConfigService());
    }

    async Invoice_paid_event(
        payload: any
    ): Promise<Class_methods_type> {
        const data = payload.data as InvoicePaidEvent;
        try {
            await this.prisma.subscriptions.upsert({
                create: {
                    stripeSubscriptionId: data.data.object.parent.subscription_details.subscription,
                    currentPeriodStart: data.data.object.period_start.toString(),
                    currentPeriodEnd: data.data.object.period_start.toString(),
                    status: "active"
                },
                update: {
                    currentPeriodStart: data.data.object.period_start.toString(),
                    currentPeriodEnd: data.data.object.period_start.toString(),
                },
                where: {
                    stripeSubscriptionId: data.data.object.parent.subscription_details.subscription
                }
            });

            // insert data to payments table
            await this.prisma.payments.create({
                data: {
                    stripeInvoiceId: data.data.object.id,
                    stripeSubscriptionId: data.data.object.parent.subscription_details.subscription,
                    amount: data.data.object.amount_paid,
                    currency: data.data.object.currency,
                    status: "succeeded",
                    paidAt: data.data.object.created.toString()
                }
            });
            
            //  TODO send confirmation email
            // sendEmail({
            //     email: payload.data.data.object.customer_details.email,
            //     subject: `You have successfully subscribe to ${payload.data.data.object.metadata.plan} plan`,
            //     body: `You have successfully subscribe to ${payload.data.data.object.metadata.plan} plan`,
            // });
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
