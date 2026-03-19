import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { sendEmail } from '../utils/rabbitmq';
import { redis } from '../redis';

const logger = new Logger('Auth');

export const createAuth = (
  configService: ConfigService,
  prisma: PrismaService
) => {
  const authUrl = configService.get<string>('BETTER_AUTH_URL');
  const authSecret = configService.get<string>('BETTER_AUTH_SECRET');

  if (!authUrl) {
    throw new Error('BETTER_AUTH_URL is not defined in environment variables');
  }

  if (!authSecret) {
    throw new Error('BETTER_AUTH_SECRET is not defined in environment variables');
  }

  return betterAuth({
    url: authUrl,
    secret: authSecret,
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }, request) => {
        await sendEmail({
          email: user.email,
          subject: 'Reset your password',
          body: `Click the link to reset your password: ${url}`,
        });

        await redis.set(
          `sendResetPasswordEmail:${user.email}`,
          new Date().toISOString().toString(),
          'EX',
          300
        );
      },
      resetPasswordTokenExpiresIn: 300,
      revokeSessionsOnPasswordReset: true,
      onPasswordReset: async ({ user }, request) => {
        logger.log(`Password reset completed for user ${user.email}`);
      },
    },
    emailVerification: {
      async sendVerificationEmail({ user, url }) {
        await sendEmail({
          email: user.email,
          subject: 'Verify your email address',
          body: `Click the link to verify your email: ${url}`,
        });

        await redis.set(
          `sendVerificationEmail:${user.id}`,
          new Date().toISOString().toString(),
          'EX',
          300
        );
      },
      autoSignInAfterVerification: true,
      sendOnSignUp: true,
      expiresIn: 300,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': {
          window: 10,
          max: 3,
        },
        '/sign-up/email': {
          window: 10,
          max: 3,
        },
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['x-forwarded-for', 'cf-connecting-ip'],
      },
    },
    trustedOrigins: ['http://localhost:3000'],
  });
};
