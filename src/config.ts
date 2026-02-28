import 'dotenv/config';

export default () => ({
  port: parseInt(process.env.PORT!, 10) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:6081@localhost:5432/find_decisions',
  RATE_LIMIT_TTL: parseInt(process.env.RATE_LIMIT_TTL ?? '60000', 10),
  RATE_LIMIT_LIMIT: parseInt(process.env.RATE_LIMIT_LIMIT ?? '100', 10),
});
