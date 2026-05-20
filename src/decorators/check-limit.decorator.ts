import { SetMetadata } from '@nestjs/common';
import { LimitKey } from '../config/plan-limits.config';

export const CHECK_LIMIT_KEY = 'check_limit';

export interface LimitMeta {
  resource: LimitKey;
  parentParam?: string;
}

export const CheckLimit = (resource: LimitKey, parentParam?: string) =>
  SetMetadata(CHECK_LIMIT_KEY, { resource, parentParam });
