import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TriggerController } from "./trigger.controller";
import { TriggerService } from "./trigger.service";

@Module({
  imports: [PrismaModule],
  controllers: [TriggerController],
  providers: [TriggerService],
  exports: [TriggerService],
})
export class TriggerModule {}
