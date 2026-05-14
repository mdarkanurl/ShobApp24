import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe, { Stripe as StripeClient } from 'stripe';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Injectable()
export class StripeService {

  private readonly stripe: StripeClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const stripeKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) throw Error('STRIPE_SECRET_KEY is not defined in env');
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
          plan: data.plan
        },
        success_url: successUrl,
        cancel_url: "",
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
}
