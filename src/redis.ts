import Redis from "ioredis";
import 'dotenv/config';
import { ConfigService } from "@nestjs/config";

const configService = new ConfigService();
const redisUrl =
  configService.get<string>("REDIS_URL") || "redis://localhost:6379";

export const redis = new Redis(redisUrl);
