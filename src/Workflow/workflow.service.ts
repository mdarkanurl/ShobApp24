import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { createWorkflowSchemaDto } from "./dto/create-workflow.dto";
import { updateWorkflowSchemaDto } from "./dto/update-workflow.dto";

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async createWorkflow(
    userId: UUID,
    data: createWorkflowSchemaDto
  ) {
    try {
      const workflow = await this.prisma.workflow.create({
        data: {
          userId,
          ...data
          },
        select: {
          id: true,
          name: true,
          enabled: true
        }
      });

      return workflow;
    } catch (error) {
      throw error;
    }
  }

  async getOneWorkflowById(
    id: string,
    userId: UUID
  ) {
    try {
      const workflow = await this.prisma.workflow.findUnique({
        where: {
          id,
          userId
        }
      });

      if(!workflow) {
        throw new NotFoundException();
      }

      return workflow;
    } catch (error) {
      throw error;
    }  
  }

  async getAllWorkflow(
    userId: UUID,
    limit: number,
    page: number,
  ) {
    try {
      const skip = (page - 1) * limit;
      const whereClause = { userId };

      const [total, workflows] = await this.prisma.$transaction([
        this.prisma.workflow.count({
          where: whereClause
        }),
        this.prisma.workflow.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            platform: true,
            enabled: true,
            createdAt: true,
            updatedAt: true
          }
        })
      ]);

      return {
        data: workflows,
        pagination: {
          totalItems: total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          pageSize: limit,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async updateWorkflow(
    id: string,
    userId: UUID,
    data: updateWorkflowSchemaDto
  ) {
    try {
      const workflow = await this.prisma.workflow.findFirst({
        where: {
          id,
          userId
        },
        select: {
          id: true
        }
      });

      if (!workflow) {
        throw new NotFoundException();
      }

      return await this.prisma.workflow.update({
        where: {
          id
        },
        data,
        select: {
          id: true,
          name: true,
          enabled: true,
          updatedAt: true
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteOneWorkflowById(
    id: string,
    userId: UUID
  ) {
    try {
      const workflow = await this.prisma.workflow.findFirst({
        where: {
          id,
          userId
        },
        select: {
          id: true,
          name: true
        }
      });

      if (!workflow) {
        throw new NotFoundException();
      }

      await this.prisma.workflow.delete({
        where: {
          id
        }
      });

      return workflow;
    } catch (error) {
      throw error;
    }
  }

  async deleteManyWorkflow(
    userId: UUID,
    ids: string[]
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const matchedCount = await tx.workflow.count({
          where: {
            userId,
            id: {
              in: ids
            }
          }
        });

        if (matchedCount !== ids.length) {
          throw new NotFoundException();
        }

        const deleted = await tx.workflow.deleteMany({
          where: {
            userId,
            id: {
              in: ids
            }
          }
        });

        return {
          deletedCount: deleted.count,
          ids
        };
      });
    } catch (error) {
      throw error;
    }
  }
}
