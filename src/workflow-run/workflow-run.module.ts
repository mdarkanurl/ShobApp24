import { Module } from '@nestjs/common';
import { WorkflowRunService } from './workflow-run.service';
import { WorkflowRunController } from './workflow-run.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkflowRunController],
  providers: [WorkflowRunService],
  exports: [WorkflowRunService],
})
export class WorkflowRunModule {}
