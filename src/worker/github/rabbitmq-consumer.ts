import { sendGitHubWebhookDataQueue } from "../../utils/rabbitmq";
import amqplib from 'amqplib';
import "dotenv/config";
import { main } from './main';

export const githubWebhookConsumer = async (channelForGitHubWebhook: amqplib.Channel) => {

  channelForGitHubWebhook.consume(
    sendGitHubWebhookDataQueue,
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
          channelForGitHubWebhook.nack(msg, false, false);
          return;
        }

        if (!payload) {
          console.error("Invalid payload:", payload);
          channelForGitHubWebhook.nack(msg, false, false);
          return;
        }

        // Call main function to execute business logic
        const res = await main(payload);

        if(!res.success) {
          channelForGitHubWebhook.nack(
            msg,
            res.allUpTo,
            res.requeue
          )
        }
        channelForGitHubWebhook.ack(msg);
      } catch (err) {
        console.error("Unexpected error in github worker:", err);
        channelForGitHubWebhook.nack(msg, false, true);
      }
    },
    {
      noAck: false,
    }
  );
};

