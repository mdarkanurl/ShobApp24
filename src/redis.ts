import Redis from "ioredis";
import 'dotenv/config';
import { ConfigService } from "@nestjs/config";

const configService = new ConfigService();
const redisUrl =
  configService.get<string>("REDIS_URL") || "redis://localhost:6379";

export const redis = new Redis(redisUrl);

let redisConnectedAt: Date | null = null;

redis.on("ready", () => {
  redisConnectedAt = new Date();
});

redis.on("close", () => {
  redisConnectedAt = null;
});

export const getRedisConnectedAt = () => redisConnectedAt;
