import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTriggerDto } from "./dto/create-trigger.dto";
import { UpdateTriggerDto } from "./dto/update-trigger.dto";

@Injectable()
export class TriggerService {
  constructor(private readonly prisma: PrismaService) {}

  async createTrigger(
    workflowId: string,
    userId: string,
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
            workflowId,
            userId
          }
        });
      });
    } catch (error) {
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
          workflowId,
          userId
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

  async getOneTriggerById(
    id: string,
    userId: string
  ) {
    try {
      const trigger = await this.prisma.trigger.findUnique({
        where: {
          id,
          userId
        }
      });

      if (!trigger) {
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
          id,
          userId
        },
        select: {
          id: true,
          userId: true
        }
      });

      if (!trigger) {
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
          workflowId,
          userId
        },
        select: {
          id: true,
          workflowId: true,
          userId: true
        }
      });

      if (!trigger) {
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
          id,
          userId
        },
        select: {
          id: true,
          workflowId: true,
          userId: true
        }
      });

      if (!trigger) {
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
