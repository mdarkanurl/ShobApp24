import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ActionController } from "./action.controller";
import { ActionService } from "./action.service";

@Module({
  imports: [PrismaModule],
  controllers: [ActionController],
  providers: [ActionService],
  exports: [ActionService],
})
export class ActionModule {}
