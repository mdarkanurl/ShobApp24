import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Put,
  Req
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { type Request } from 'express';
import { createCheckoutSessionSchema, type CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { type updateSubscriptionDto, updateSubscriptionSchema } from './dto/update-subscription.dto';

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

  @Put("/update-plan")
  @RateLimit({ points: 5, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async updateSubscriptions(
    @Req() req: Request,
    @Body(new ZodValidationPipe(updateSubscriptionSchema))
    body: updateSubscriptionDto
  ) {
    try {
      const userId: string = req.session.user.id;

      await this.stripeService.updateSubscription(
        userId,
        body
      );

      return {
        success: true,
        message: "Your request will be processed",
        data: null,
        error: null,
      }
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to update subscription");
    }
  }

  @Get("/get-current-subscription")
  @RateLimit({ points: 5, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async getCurrentSubscription(
    @Req() req: Request,
  ) {
    try {
      const userId: string = req.session.user.id;

      const response = await this.stripeService
        .getCurrentSubscription(userId);

      return {
        success: true,
        message: "Current subscription fetched successfully",
        data: response,
        error: null,
      }
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to fetch current subscription");
    }
  }

  @Post("/cancel-subscription")
  @RateLimit({ points: 5, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @Req() req: Request,
  ) {
    try {
      const userId: string = req.session.user.id;

      await this.stripeService.cancelSubscription(userId);

      return {
        success: true,
        message: "Subscription will be cancelled",
        data: null,
        error: null,
      }
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to cancel subscription");
    }
  }

  @Post("/webhook")
  @HttpCode(HttpStatus.OK)
  @AllowAnonymous()
  async webhook(
    @Body() body: any,
    @Headers() headers: any
  ) {
    try {
      const sig = headers['stripe-signature'];
      await this.stripeService.webhook(body, sig);

      return {
        success: true,
        message: "Webhook data enqueue for processing",
        data: null,
        error: null,
      }
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to enqueue webhook data");
    }
  }
}
