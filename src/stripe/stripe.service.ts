import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe, { Stripe as StripeClient } from 'stripe';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { sendStripeWebhookData } from '../utils/rabbitmq';
import { updateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class StripeService {

  private readonly stripe: StripeClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const stripeKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeKey);
  }

  async createCheckoutSession(
    userId: string,
    data: CreateCheckoutSessionDto
  ) {
    try {
      // get the env variables
      const priceId = this.loadPriceId(data.plan);
      const successUrl = this.loadSuccessUrl();

      const stripe = this.stripe;
      const stripeCustomerId = await this.getStripeCustomerId(userId);

      // create checkout session
      const session = await stripe.checkout.sessions.create({
        client_reference_id: userId,
        customer: stripeCustomerId,
        metadata: {
          userId,
          plan: data.plan,
          priceId
        },
        success_url: successUrl,
        cancel_url: this.loadSuccessUrl(),
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        expires_at: Math.floor(Date.now() / 1000) + (60 * 60)
      });
      return {
        checkoutId: session.id,
        checkoutUrl: session.url
      }
    } catch (error) {
      throw error
    }
  }

  async webhook(
    data: Buffer,
    sig: string
  ): Promise<void> {
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(data, sig, this.loadStripeSecret());
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      throw new BadRequestException();
    }
    const parsedData = JSON.parse(data.toString());
    await sendStripeWebhookData({ data: parsedData, event });
  }

  async updateSubscription(
    userId: string,
    data: updateSubscriptionDto
  ) {
    // get env
    const priceId = this.loadPriceId(data.plan);

    // 1. Find local subscription
    const localSubscription = await this.prisma.subscriptions.findFirst({
      where: {
        userId,
        status: "active"
      },
      select: {
        id: true,
        stripeSubscriptionId: true
      }
    });

    if (!localSubscription) throw new BadRequestException('Subscription not found');

    // 2. Retrieve subscription from Stripe
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      localSubscription.stripeSubscriptionId
    );

    // 3. Get the correct subscription item
    const subscriptionItem = stripeSubscription.items.data[0];

    if (!subscriptionItem) throw new BadRequestException('Subscription item not found');
    if(subscriptionItem.price.id === priceId) throw new BadRequestException('Same subscription can\'t be change');

    // 4. Update subscription plan
    await this.stripe.subscriptions.update(
      stripeSubscription.id,
      {
        items: [
          {
            id: subscriptionItem.id,
            price: priceId,
          },
        ],

        // Stripe will calculate partial charges/credits
        proration_behavior: 'create_prorations',

        metadata: {
          userId,
          priceId,
          plan: data.plan,
        }
      },
    );
  }

  async getCurrentSubscription(
    userId: string
  ) {
    try {
      const localSubscription = await this.prisma.subscriptions.findFirst({
        where: {
          userId,
          status: "active"
        },
        select: {
          id: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          createdAt: true,
        }
      });

      if (!localSubscription) throw new BadRequestException('Subscription not found');

      // TODO return here also plan (e.g Pro, Basic)
      return {
        ...localSubscription,
      };
    } catch (error) {
      throw error
    }
  }

  async cancelSubscription(
    userId: string
  ) {
    try {
      const localSubscription = await this.prisma.subscriptions.findFirst({
        where: {
          userId,
          status: "active"
        },
        select: {
          stripeSubscriptionId: true
        }
      });

      if (!localSubscription) throw new BadRequestException('Subscription not found');

      await this.stripe.subscriptions.cancel(
        localSubscription.stripeSubscriptionId,
      );
    } catch (error) {
      if (error instanceof this.stripe.errors.StripeInvalidRequestError
        && error.message.startsWith("No such subscription:")
      ) {
        throw new BadRequestException('Subscription not found');
      }
      throw error;
    }
  }

  private async getStripeCustomerId(userId: string): Promise<string> {
    try {
      const stripe = this.stripe;

      // get the user from DB
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId
        },
        select: {
          email: true,
          name: true,
          stripeCustomerId: true
        }
      });

      if(user?.stripeCustomerId) return user.stripeCustomerId;

      const customer  = await stripe.customers.list({
        email: user?.email
      });

      if(customer.data.length) {
        await this.prisma.user.update({
          where: {
            id: userId
          },
          data: {
            stripeCustomerId: customer.data[0].id
          }
        });
        
        return customer.data[0].id;
      }

      const createCustomer = await stripe.customers.create({
        email: user?.email,
        name: user?.name,
        metadata: {
          userId,
        }
      });

      await this.prisma.user.update({
        where: {
          id: userId
        },
        data: {
          stripeCustomerId: createCustomer.id
        }
      });
      
      return createCustomer.id;
    } catch (error) {
      throw error
    }
  }

  private loadSuccessUrl(): string {
    return this.configService.getOrThrow<string>('STRIPE_SUCCESS_URL');
  }

  private loadPriceId(plan: CreateCheckoutSessionDto["plan"]): string {
    switch (plan) {
      case 'Basic':
        return this.configService.getOrThrow<string>('BASIC_PRICE_ID');
      case "Pro":
        return this.configService.getOrThrow<string>('PRO_PRICE_ID');
      default:
        throw new Error(`Unsupported plan: ${plan}`);
    }
  }

  private loadStripeSecret(): string {
    return this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
  }
}
