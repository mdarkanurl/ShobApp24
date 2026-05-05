import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  constructor(
    private readonly configService: ConfigService
  ) {}
}
