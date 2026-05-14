import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { type Request } from 'express';
import { createCheckoutSessionSchema, type CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

@Controller({ path: 'stripe', version: '1' })
export class StripeController {
  constructor(
    private readonly stripeService: StripeService
  ) {}

  @Post("/create-checkout-session")
  @RateLimit({ points: 5, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(
    @Req() req: Request,
    @Body(new ZodValidationPipe(createCheckoutSessionSchema))
    body: CreateCheckoutSessionDto
  ) {
    try {
      const userId: string = req.session.user.id;
      
      const response = await this.stripeService
        .createCheckoutSession(userId, body);

      return {
        success: true,
        message: "Checkout session created successfully",
        data: response,
        error: null,
      }
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to create checkout session");
    }
  }
}
