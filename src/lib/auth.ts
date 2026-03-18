import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import 'dotenv/config';
import { sendEmail } from '../utils/rabbitmq';
import { redis } from '../redis';
import emailTemplates from 'src/utils/emailTemplates';

const Prisma = new PrismaService();
const API_VERSION = process.env.API_VERSION || 'v1';
const logger = new Logger('Auth');

export const auth = betterAuth({
  url: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: prismaAdapter(Prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    // ---------------- Reset Password Email ----------------
    sendResetPassword: async ({ user, url }) => {
      // 1. URL decode
      const decodedUrl = decodeURIComponent(url);

      // 2. API version replace
      const fixedUrl = decodedUrl.replace(
        '/api/auth/reset-password',
        `/api/${API_VERSION}/auth/reset-password`
      );

      console.log("Reset password link:", fixedUrl);

      // 3. Send Email
      await sendEmail({
        email: user.email,
        subject: 'Reset your password',
        body: emailTemplates.getVerifyEmailHtml({ email: user.email, fixedUrl }),
      });

      // 4. Track in Redis (rate-limit)
      await redis.set(
        `sendResetPasswordEmail:${user.email}`,
        new Date().toISOString(),
        'EX',
        300
      );
    },

    resetPasswordTokenExpiresIn: 300, // 5 minutes
    revokeSessionsOnPasswordReset: true,

    onPasswordReset: async ({ user }) => {
      logger.log(`Password reset completed for user ${user.email}`);
    },
  },

  // ---------------- Email Verification ----------------
  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      // Decode URL
      const decodedUrl = decodeURIComponent(url);

      // Replace API version
      const fixedUrl = decodedUrl.replace(
        "/api/auth/verify-email",
        `/api/${API_VERSION}/auth/verify-email`
      );

      console.log("Verify email link:", fixedUrl);

      await sendEmail({
        email: user.email,
        subject: 'Verify your email address',
        body: emailTemplates.getVerifyEmailHtml({ email: user.email, fixedUrl }),
      });

      await redis.set(
        `sendVerificationEmail:${user.id}`,
        new Date().toISOString(),
        'EX',
        300
      );
    },

    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    expiresIn: 300, // 5 minutes
  },

  // ---------------- Rate Limit ----------------
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 10, max: 3 },
      '/sign-up/email': { window: 10, max: 3 },
    },
  },

  // ---------------- Advanced ----------------
  advanced: {
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'cf-connecting-ip'],
    },
  },

  trustedOrigins: ['http://localhost:3000','https://githubs24.vercel.app'],
});