import { sendGitHubWebhookDataQueue } from "../../utils/rabbitmq";
import amqplib from 'amqplib';
import "dotenv/config";
import { ProcessGitHubWebhookData } from "./process-github-webhook-data";
const processGitHubWebhookData = new ProcessGitHubWebhookData();

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

        switch (payload.event) {
          case "installation":
            const installationEvent = await processGitHubWebhookData
              .Installation_event(payload);

            if(!installationEvent.success) {
              channelForGitHubWebhook.nack(
                payload,
                installationEvent.allUpTo,
                installationEvent.requeue
              )
            }
            channelForGitHubWebhook.ack(payload);
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