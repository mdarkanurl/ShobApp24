import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import type { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { RATE_LIMIT_KEY } from './rate-limit.decorator';
import { RateLimitOptions } from './dto/Rate-limit-options.dto';
import { redis } from 'src/redis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limiters = new Map<string, RateLimiterRedis>();

  constructor(
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const config = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!config) {
      return true;
    }

    const user = request.user;
    const ip = this.getIp(request);
    console.log(ip);

    const identity = user ? `user:${user.id}` : `ip:${ip}`;
    const route = this.getRouteKey(request, context);

    const key = `${route}:${identity}`;

    const limiter = this.getLimiter(route, config);

    try {
      await limiter.consume(key);
      return true;
    } catch (err: any) {
      throw new HttpException({
        message: 'Too many requests',
        retryAfter: Math.ceil(err.msBeforeNext / 1000),
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private getLimiter(route: string, config: RateLimitOptions) {
    const limiterKey = `${route}:${config.points}:${config.duration}`;

    if (!this.limiters.has(limiterKey)) {
      this.limiters.set(
        limiterKey,
        new RateLimiterRedis({
          storeClient: redis,
          keyPrefix: `rl:${route}`,
          points: config.points,
          duration: config.duration,
          blockDuration: config.blockDuration || 0,
        }),
      );
    }

    return this.limiters.get(limiterKey)!;
  }

  private getRouteKey(request: any, context: ExecutionContext): string {
    if (request.route?.path) {
      return `${request.method}:${request.route.path}`;
    }

    return `${context.getClass().name}:${context.getHandler().name}`;
  }

  private getIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0];

    const ip =
      request.ip ||
      forwardedIp?.trim() ||
      request.socket.remoteAddress ||
      'unknown';

    return ip.replace(/^::ffff:/, '').trim();
  }
}
