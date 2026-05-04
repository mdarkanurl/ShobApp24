import { Module } from '@nestjs/common';
import { ActionRunService } from './action-run.service';
import { ActionRunController } from './action-run.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ActionRunController],
  providers: [ActionRunService],
  exports: [ActionRunService],
})
export class ActionRunModule {}
