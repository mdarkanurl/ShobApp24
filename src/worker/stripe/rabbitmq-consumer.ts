import { sendStripeWebhookDataQueue } from "../../utils/rabbitmq";
import amqplib from 'amqplib';
import "dotenv/config";
import { main } from './main';

export const stripeWebhookConsumer = async (channelForStripeWebhook: amqplib.Channel) => {

  channelForStripeWebhook.consume(
    sendStripeWebhookDataQueue,
    async (msg) => {
      if (!msg) {
        console.warn("Consumer cancelled by server");
        return;
      }

      try {
        const raw = msg.content.toString("utf-8");

        let payload: any;

        try {
          payload = JSON.parse(raw);
        } catch (err) {
          console.error("Invalid JSON in queue message:", raw);
          channelForStripeWebhook.nack(msg, false, false);
          return;
        }

        if (!payload) {
          console.error("Invalid payload:", payload);
          channelForStripeWebhook.nack(msg, false, false);
          return;
        }

        // Call main function to execute business logic
        const res = await main(payload);

        if(!res.success) {
          channelForStripeWebhook.nack(
            msg,
            res.allUpTo,
            res.requeue
          );
          return;
        }

        channelForStripeWebhook.ack(msg);
      } catch (err) {
        console.error("Unexpected error in stripe worker:", err);
        channelForStripeWebhook.nack(msg, false, false);
      }
    },
    {
      noAck: false,
    }
  );
};
