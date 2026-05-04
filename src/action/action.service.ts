import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createActionDto, createActionSchemaByEventType } from "./dto/create-action.dto";
import { UpdateActionByIdDto, updateActionSchemaByEventType } from "./dto/update-action.dto";

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
            id: true,
            eventType: true,
          }
        });

      if(!workflow) {
        throw new NotFoundException("Workflow not found");
      }

      // TODO write test for this edge case
      if(data.type.includes("send_email_to_me") && "config" in data) {
        const useremail = await this.prisma.user.findUnique({
          where: {
            id: userId
          },
          select: {
            email: true
          }
        });

        if(!useremail) throw new NotFoundException('Your email not found');
        if("email" in data.config) data.config.email = useremail.email;
      }

      const { success, error, data: parsedData } = createActionSchemaByEventType(workflow.eventType).safeParse(data);

      if (!success) {
        throw new BadRequestException(error.issues);
      }

      const actions = await this.prisma.action.count({
        where: {
          workflowId
        }
      });

      if(parsedData.step !== (actions + 1)) {
        throw new BadRequestException("Incorrect step");
      }

      return this.prisma.action.create({
        data: {
          ...parsedData,
          config: JSON.stringify("config" in parsedData? parsedData.config : null),
          workflowId,
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
          id
        },
        select: {
          id: true,
          config: true,
          createdAt: true,
          platform: true,
          step: true,
          type: true,
          workflowId: true,
          workflow: {
            select: {
              userId: true
            }
          }
        }
      });

      if (!action || action.workflow.userId !== userId) {
        throw new NotFoundException("Action not found");
      }

      return action;
    } catch (error) {
      throw error;
    }
  }

  // TODO write test cases for this function
  async updateActionById(
    userId: string,
    data: UpdateActionByIdDto,
    actionId: string
  ) {
    try {
      // Check is user has permission to update the action
      const action = await this.prisma.action.findFirst({
        where: {
          id: actionId,
          workflow: {
            userId: userId
          }
        },
        select: {
          id: true,
          workflow: {
            select: {
              eventType: true
            }
          }
        }
      });

      if (!action) throw new NotFoundException("action not found");

      // checks user input
      const { success, error, data: parsedData } = updateActionSchemaByEventType(
        action.workflow.eventType
      ).safeParse(data);

      if (!success) {
        throw new BadRequestException(error.issues);
      }

      // Update the
      return this.prisma.action.update({
        where: {
          id: actionId
        },
        data: {
          ...parsedData
        }
      });
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
            id
          },
          select: {
            id: true,
            workflowId: true,
            step: true,
            workflow: {
              select: {
                userId: true
              }
            }
          }
        });

        if (!action || action.workflow.userId !== userId) {
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
