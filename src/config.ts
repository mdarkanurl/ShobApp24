import 'dotenv/config';

export default () => ({
  GITHUB_APP_NAME: process.env.GITHUB_APP_NAME || "shobapp24",
  GITHUB_SECRET: process.env.GITHUB_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  MAX_LIMIT: parseInt(process.env.MAX_LIMIT!, 10) || 100,
  REDIS_URL: process.env.REDIS_URL,
  RABBITMQ_URL: process.env.RABBITMQ_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  API_VERSION: process.env.API_VERSION,
  PORT: parseInt(process.env.PORT!, 10) || 3000,
});
