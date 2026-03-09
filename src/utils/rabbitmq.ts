import amqplib from 'amqplib';
import { startEmailConsumer } from './send-email';
import { sendEmailDto } from './dto/send-email.dto';

const sendGitHubWebhookDataQueue = 'sendGitHubWebhookData';
export const sendEmailQueue = 'sendEmail';

let conn: amqplib.ChannelModel;
const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://localhost';

let channelForGitHubWebhook: amqplib.Channel;
let channelForsendEmail: amqplib.Channel;

const rabbitmq = async () => {
  conn = await amqplib.connect(rabbitMqUrl);

  // Send  email
  channelForsendEmail = await conn.createChannel();
  await channelForsendEmail.assertQueue(sendEmailQueue);
  await startEmailConsumer();

  // Send GitHub webhook data
  channelForGitHubWebhook = await conn.createChannel();
  await channelForGitHubWebhook.assertQueue(sendGitHubWebhookDataQueue);

};

const sendEmail = async (data: sendEmailDto) => {
  const channel = await conn.createChannel();
  const payload = JSON.stringify(data);
  channel.sendToQueue(sendEmailQueue, Buffer.from(payload, "utf-8"));
}

const sendGitHubWebhookData = async (data: any) => {
  const channel = await conn.createChannel();
  const payload = JSON.stringify(data);
  channel.sendToQueue(sendGitHubWebhookDataQueue, Buffer.from(payload, "utf-8"));
}

export {
  rabbitmq,
  sendEmail,
  sendGitHubWebhookData,
  channelForsendEmail,
  channelForGitHubWebhook
}
