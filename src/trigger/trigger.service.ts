import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTriggerDto } from "./dto/create-trigger.dto";
import { UpdateTriggerDto } from "./dto/update-trigger.dto";

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
      console.log(error);
      throw error;
    }
  }

  async getTriggerByWorkflowId(
    workflowId: string,
    userId: string
  ) {
    try {
      const trigger = await this.prisma.trigger.findFirst({
        where: {
          workflowId
        },
        select: {
          id: true,
          workflowId: true,
          platform: true,
          eventType: true,
          config: true,
          createdAt: true,
          workflow: {
            select: {
              userId: true
            }
          }
        }
      });

      if (!trigger || trigger.workflow.userId !== userId) {
        throw new BadRequestException("Trigger not found");
      }

      return trigger;
    } catch (error) {
      throw error;
    }
  }

  async getOneTriggerById(
    id: string,
    userId: string
  ) {
    try {
      const trigger = await this.prisma.trigger.findUnique({
        where: {
          id
        },
        select: {
          id: true,
          config: true,
          eventType: true,
          platform: true,
          workflowId: true,
          createdAt: true,
          workflow: {
            select: {
              userId: true
            }
          }
        }
      });

      if (!trigger || trigger.workflow.userId !== userId) {
        throw new NotFoundException("Trigger not found");
      }

      return trigger;
    } catch (error) {
      throw error;
    }
  }

  async updateTriggerById(
    id: string,
    userId: string,
    data: UpdateTriggerDto,
  ) {
    try {
      const trigger = await this.prisma.trigger.findUnique({
        where: {
          id
        },
        select: {
          id: true,
          workflow: {
            select: {
              userId: true
            }
          }
        }
      });

      if (!trigger || trigger.workflow.userId !== userId) {
        throw new NotFoundException("Trigger not found");
      }

      return await this.prisma.trigger.update({
        where: {
          id
        },
        data: {
          ...data
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteTriggerByWorkflowId(
    workflowId: string,
    userId: string
  ) {
    try {
      const trigger = await this.prisma.trigger.findFirst({
        where: {
          workflowId
        },
        select: {
          id: true,
          workflow: {
            select: {
              userId: true
            }
          }
        }
      });

      if (!trigger || trigger.workflow.userId !== userId) {
        throw new NotFoundException("Trigger not found");
      }

      await this.prisma.trigger.delete({
        where: {
          id: trigger.id
        }
      });

      return trigger;
    } catch (error) {
      throw error;
    }
  }

  async deleteTriggerById(
    id: string,
    userId: string
  ) {
    try {
      const trigger = await this.prisma.trigger.findFirst({
        where: {
          id
        },
        select: {
          id: true,
          workflow: {
            select: {
              userId: true
            }
          }
        }
      });

      if (!trigger || trigger.workflow.userId !== userId) {
        throw new NotFoundException("Trigger not found");
      }

      await this.prisma.trigger.delete({
        where: {
          id
        }
      });

      return trigger;
    } catch (error) {
      throw error;
    }
  }
}
