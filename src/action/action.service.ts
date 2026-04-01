import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { createActionDto } from "./dto/create-action.dto";

@Injectable()
export class ActionService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllActionsByWorkflowId(
    workflowId: string,
    userId: string
  ) {
    try {
      const workflow = await this.prisma.workflow.findUnique({
        where: {
          id: workflowId,
          userId
        },
        select: {
          id: true,
        }
      });

      if (!workflow) {
        throw new NotFoundException("Workflow not found");
      }

      return await this.prisma.action.findMany({
        where: {
          workflowId
        },
        orderBy: {
          step: "asc"
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async createAction(
    workflowId: string,
    userId: string,
    data: createActionDto
  ) {
    try {
      const workflow = await this.prisma.workflow
        .findUnique({
          where: {
            id: workflowId,
            userId
          },
          select: {
            id: true
          }
        });

      if(!workflow) {
        throw new NotFoundException("Workflow not found");
      }

      const actions = await this.prisma.action.count({
        where: {
          workflowId
        }
      });

      if(data.step !== (actions + 1)) {
        throw new BadRequestException("Incorrect step");
      }

      return this.prisma.action.create({
        data: {
          ...data,
          workflowId,
          userId,
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getOneActionById(
    id: string,
    userId: string
  ) {
    try {
      const action = await this.prisma.action.findUnique({
        where: {
          id,
          userId
        }
      });

      if (!action) {
        throw new NotFoundException("Action not found");
      }

      return action;
    } catch (error) {
      throw error;
    }
  }

  async deleteAllActionsByWorkflowId(
    workflowId: string,
    userId: string
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const workflow = await tx.workflow.findUnique({
          where: {
            id: workflowId,
            userId
          },
          select: {
            id: true
          }
        });

        if (!workflow) {
          throw new NotFoundException("Workflow not found");
        }

        const deleted = await tx.action.deleteMany({
          where: {
            workflowId
          }
        });

        return {
          workflowId,
          deletedCount: deleted.count
        };
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteActionById(
    id: string,
    userId: string
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const action = await tx.action.findFirst({
          where: {
            id,
            userId
          },
          select: {
            id: true,
            workflowId: true,
            step: true
          }
        });

        if (!action) {
          throw new NotFoundException("Action not found");
        }

        await tx.action.delete({
          where: {
            id
          }
        });

        await tx.action.updateMany({
          where: {
            workflowId: action.workflowId,
            step: {
              gt: action.step
            }
          },
          data: {
            step: {
              decrement: 1
            }
          }
        });

        return action;
      });
    } catch (error) {
      throw error;
    }
  }
}
