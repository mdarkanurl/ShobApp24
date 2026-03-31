import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { createAuth } from "./lib/auth";
import { LocalAuthModule } from "./auth/auth.module";
import config from './config';
import { GithubModule } from './github/github.module';
import { PrismaService } from './prisma/prisma.service';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { WorkflowModule } from './workflow/workflow.module';
import { TriggerModule } from './trigger/trigger.module';
import { ActionModule } from './action/action.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath: `.env`,
    }),
    RateLimitModule,
    PrismaModule,
    LocalAuthModule,
    AuthModule.forRootAsync({
      imports: [ConfigModule, PrismaModule],
      inject: [ConfigService, PrismaService],
      useFactory: (
        configService: ConfigService,
        prismaService: PrismaService,
      ) => ({
        auth: createAuth(configService, prismaService),
      }),
    }),
    GithubModule,
    WorkflowModule,
    TriggerModule,
    ActionModule,
    HealthModule,
  ]
})
export class AppModule {}
