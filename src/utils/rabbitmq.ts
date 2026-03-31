import amqplib from 'amqplib';
import { ConfigService } from '@nestjs/config';
import { startEmailConsumer } from '../worker/send-email/send-email';
import { githubWebhookConsumer } from 'src/worker/github-webhook/github-webhook';

export const sendGitHubWebhookDataQueue = 'sendGitHubWebhookData';
export const sendEmailQueue = 'sendEmail';

// DLQ + DLX names
const sendEmailDLX = 'sendEmail.dlx';
const sendEmailDLQ = 'sendEmail.dlq';

const githubWebhookDLX = 'sendGitHubWebhookData.dlx';
const githubWebhookDLQ = 'sendGitHubWebhookData.dlq';

let conn: amqplib.ChannelModel;
let rabbitMqConnectedAt: Date | null = null;

let channelForsendEmail: amqplib.Channel;
let channelForGitHubWebhook: amqplib.Channel;

const getRabbitMqUrl = () => {
  const configService = new ConfigService();
  return configService.get<string>('RABBITMQ_URL') || 'amqp://localhost';
};

const rabbitmq = async () => {
  const rabbitMqUrl = getRabbitMqUrl();

  conn = await amqplib.connect(rabbitMqUrl);
  rabbitMqConnectedAt = new Date();

  conn.on('close', () => {
    console.error('RabbitMQ connection closed');
    rabbitMqConnectedAt = null;
  });

  conn.on('error', (err) => {
    console.error('RabbitMQ connection error:', err);
  });

  // ---------------- EMAIL SETUP ----------------
  channelForsendEmail = await conn.createChannel();

  await channelForsendEmail.assertExchange(sendEmailDLX, 'direct', {
    durable: true,
  });

  await channelForsendEmail.assertQueue(sendEmailDLQ, {
    durable: true,
  });

  await channelForsendEmail.bindQueue(
    sendEmailDLQ,
    sendEmailDLX,
    'dlq'
  );

  await channelForsendEmail.assertQueue(sendEmailQueue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': sendEmailDLX,
      'x-dead-letter-routing-key': 'dlq',
    },
  });

  // ---------------- GITHUB WEBHOOK SETUP ----------------
  channelForGitHubWebhook = await conn.createChannel();

  await channelForGitHubWebhook.assertExchange(githubWebhookDLX, 'direct', {
    durable: true,
  });

  await channelForGitHubWebhook.assertQueue(githubWebhookDLQ, {
    durable: true,
  });

  await channelForGitHubWebhook.bindQueue(
    githubWebhookDLQ,
    githubWebhookDLX,
    'dlq'
  );

  await channelForGitHubWebhook.assertQueue(sendGitHubWebhookDataQueue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': githubWebhookDLX,
      'x-dead-letter-routing-key': 'dlq',
    },
  });

  // Start consumers AFTER setup
  await startEmailConsumer(channelForsendEmail);
  await githubWebhookConsumer(channelForGitHubWebhook);
};

const sendEmail = async (data: any) => {
  if (!channelForsendEmail) {
    throw new Error('Email channel not initialized');
  }

  const payload = JSON.stringify(data);

  channelForsendEmail.sendToQueue(
    sendEmailQueue,
    Buffer.from(payload, 'utf-8'),
    { persistent: true }
  );
};

const sendGitHubWebhookData = async (data: any) => {
  if (!channelForGitHubWebhook) {
    throw new Error('GitHub channel not initialized');
  }

  const payload = JSON.stringify(data);

  channelForGitHubWebhook.sendToQueue(
    sendGitHubWebhookDataQueue,
    Buffer.from(payload, 'utf-8'),
    { persistent: true }
  );
};

export {
  rabbitmq,
  sendEmail,
  sendGitHubWebhookData,
  channelForsendEmail,
  channelForGitHubWebhook,
  conn,
  rabbitMqConnectedAt,
};