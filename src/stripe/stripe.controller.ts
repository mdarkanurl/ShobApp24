import {
  Controller
} from '@nestjs/common';
import { StripeService } from './stripe.service';

@Controller({ path: 'stripe', version: '1' })
export class StripeController {
  constructor(
    private readonly stripeService: StripeService
  ) {}

  
}
