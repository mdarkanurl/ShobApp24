import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTriggerDto } from "./dto/create-trigger.dto";

@Injectable()
export class TriggerService {
  constructor(private readonly prisma: PrismaService) {}

  async createTrigger(
    workflowId: string,
    data: CreateTriggerDto
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const workflow = await tx.workflow.findUnique({
          where: {
            id: workflowId
          },
          select: {
            id: true
          }
        });

        if(!workflow) {
          throw new BadRequestException("Workflow not found");
        }

        const trigger = await tx.trigger.findFirst({
          where: {
            workflowId
          }
        });

        if(trigger) {
          throw new BadRequestException("Trigger already exists under this workflow");
        }

        return this.prisma.trigger.create({
          data: {
            ...data,
            workflowId
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  async getTriggerByWorkflowId(workflowId: string) {
    try {
      const trigger = await this.prisma.trigger.findFirst({
        where: {
          workflowId
        }
      });

      if (!trigger) {
        throw new BadRequestException("Trigger not found");
      }

      return trigger;
    } catch (error) {
      throw error;
    }
  }
}
