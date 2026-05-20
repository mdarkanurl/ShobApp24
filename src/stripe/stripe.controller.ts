import {
  BadRequestException,
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
  Query,
  Req
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { type Request } from 'express';
import { createCheckoutSessionSchema, type CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { type updateSubscriptionDto, updateSubscriptionSchema } from './dto/update-subscription.dto';
import { ConfigService } from '@nestjs/config';

@Controller({ path: 'stripe', version: '1' })
export class StripeController {
  private readonly maxLimit: number;

  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService
  ) {
    const maxLimitValue = this.configService.get<number>('MAX_LIMIT');
    this.maxLimit =
      typeof maxLimitValue === 'number' && !Number.isNaN(maxLimitValue)
        ? maxLimitValue
        : 100;
  }

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

  @Get("/invoices")
  @RateLimit({ points: 5, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async getInvoices(
    @Req() req: Request,
    @Query() query: any,
  ) {
    try {
      const userId: string = req.session.user.id;
      const page = Math.max(parseInt(query.page) || 1, 1);
      const limit = Math.max(parseInt(query.limit) || 10, 1);

      if (limit >= this.maxLimit) {
        throw new BadRequestException("Limit is too big");
      }

      const response = await this.stripeService
        .getInvoices(userId, limit, page);

      return {
        success: true,
        message: "Invoices fetched successfully",
        data: response,
        error: null,
      }
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to fetch invoices");
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

  @Post("/billing-portal")
  @RateLimit({ points: 5, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async createBillingPortalSession(
    @Req() req: Request,
  ) {
    try {
      const userId: string = req.session.user.id;

      const response = await this.stripeService
        .createBillingPortalSession(userId);

      return {
        success: true,
        message: "Successfully create the billing portal url",
        data: response,
        error: null,
      }
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to get billing portal url"); 
    }
  }
}
