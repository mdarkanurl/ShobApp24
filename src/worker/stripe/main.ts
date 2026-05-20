import { Class_methods_type } from "./types/class-methods-type";
import {
    Checkout_session_completed_event,
    Customer_subscription_created_event,
    Customer_subscription_updated_event,
    Customer_subscription_deleted_event,
    Invoice_paid_event,
    Invoice_payment_failed_event
} from "./core";

const checkout_session_completed = new Checkout_session_completed_event();
const customer_subscription_created = new Customer_subscription_created_event();
const customer_subscription_updated = new Customer_subscription_updated_event();
const customer_subscription_deleted = new Customer_subscription_deleted_event();
const invoice_paid = new Invoice_paid_event();
const invoice_payment_failed = new Invoice_payment_failed_event();

export async function main(payload: any): Promise<Class_methods_type> {
  const event = payload.event.type;
    try {
        switch (event) {
          case "checkout.session.completed":
            return await checkout_session_completed.Checkout_session_completed_event(payload);

          case "customer.subscription.created":
            return await customer_subscription_created.Customer_subscription_created_event(payload);

          case "customer.subscription.updated":
            return await customer_subscription_updated.Customer_subscription_updated_event(payload);

          case "customer.subscription.deleted":
            return await customer_subscription_deleted.Customer_subscription_deleted_event(payload);

          case "invoice.paid":
            return await invoice_paid.Invoice_paid_event(payload);

          case "invoice.payment_failed":
            return await invoice_payment_failed.Invoice_payment_failed_event(payload);

          default:
            console.log("Unknown event");
            return {
                success: true
            };
        }
    } catch (error) {
        return {
            success: false,
            message: "",
            allUpTo: false,
            requeue: true
        }
    }
}