import { SetMetadata } from '@nestjs/common';
import { RateLimitOptions } from './dto/Rate-limit-options.dto';

export const RATE_LIMIT_KEY = 'rate_limit';

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);