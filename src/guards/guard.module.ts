import { Module } from '@nestjs/common';
import { PlanLimitGuard } from './plan-limit.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    PrismaModule,
  ],
  providers: [
    {
        provide: APP_GUARD,
        useClass: PlanLimitGuard,
    },
  ],
})
export class GuardModule {}
