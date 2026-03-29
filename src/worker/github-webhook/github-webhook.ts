import { channelForGitHubWebhook, sendGitHubWebhookDataQueue } from "../../utils/rabbitmq";
import "dotenv/config";
import { ProcessGitHubWebhookData } from "./process-github-webhook-data";
const processGitHubWebhookData = new ProcessGitHubWebhookData();

export const githubWebhookConsumer = async () => {

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
          channelForGitHubWebhook.ack(msg);
          return;
        }

        const {  } = payload;

        if (!payload) {
          console.error("Invalid email payload:", payload);
          channelForGitHubWebhook.ack(msg);
          return;
        }

        switch (payload.event) {
          case "installation":
            const installationEvent = await processGitHubWebhookData
              .Installation_event(payload);

            if(!installationEvent) {
              console.error("Unexpected error in Installation_event worker");
              channelForGitHubWebhook.nack(msg, false, true);
            }
            channelForGitHubWebhook.ack(msg);
            break;
          case "star":
            // Write here for star event

          break;
        
          default:
            console.log("Unknown event");
            channelForGitHubWebhook.ack(msg);
            break;
        }
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