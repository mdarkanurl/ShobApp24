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
          id: workflowId
        },
        select: {
          id: true,
          userId: true
        }
      });

      if (!workflow || workflow.userId !== userId) {
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
            id: workflowId
          },
          select: {
            id: true,
            userId: true
          }
        });

      if(!workflow || workflow.userId !== userId) {
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

  async deleteActionById(
    id: string,
    userId: string
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const action = await tx.action.findFirst({
          where: {
            id
          },
          select: {
            id: true,
            workflowId: true,
            userId: true,
            step: true
          }
        });

        if (!action || action.userId !== userId) {
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
