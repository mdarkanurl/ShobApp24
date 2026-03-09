import { channelForGitHubWebhook, sendGitHubWebhookDataQueue } from "../../utils/rabbitmq";
import "dotenv/config";

export const startEmailConsumer = async () => {

  channelForGitHubWebhook.consume(
    sendGitHubWebhookDataQueue,
    async (msg) => {
      if (!msg) {
        console.warn("Consumer cancelled by server");
        return;
      }

      try {
        const raw = msg.content.toString("utf-8");

        // TODO write dto for webhook data
        let payload: any;

        try {
          payload = JSON.parse(raw);
        } catch (err) {
          console.error("Invalid JSON in queue message:", raw);
          channelForGitHubWebhook.ack(msg);
          return;
        }

        const {  } = payload;

        if (!payload) {
          console.error("Invalid email payload:", payload);
          channelForGitHubWebhook.ack(msg);
          return;
        }
    
        // TODO handle webhook data

        channelForGitHubWebhook.ack(msg);
      } catch (err) {
        console.error("Unexpected error in email worker:", err);
        channelForGitHubWebhook.nack(msg, false, true);
      }
    },
    {
      noAck: false,
    }
  );
};