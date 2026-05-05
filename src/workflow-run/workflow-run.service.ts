import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RunStatus } from '@prisma/client';

@Injectable()
export class WorkflowRunService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllWorkflowRuns(
    userId: string,
    workflowId: string,
    limit: number,
    page: number,
    status?: RunStatus
  ) {
    try {
      const skip = (page - 1) * limit;

      const workflow = await this.prisma.workflow.findFirst({
        where: {
          id: workflowId,
          userId,
        },
        select: {
          id: true,
        },
      });

      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      const [total, workflowRuns] = await this.prisma.$transaction([
        this.prisma.workflowRun.count({
          where: {
            workflowId,
            status
          },
        }),
        this.prisma.workflowRun.findMany({
          where: {
            workflowId,
            status
          },
          skip,
          take: limit,
          orderBy: { startedAt: 'desc' },
          omit: {
            payload: true,
            output: true,
          },
        }),
      ]);

      if (!workflowRuns.length) {
        throw new NotFoundException('No workflow run data found');
      }

      return {
        data: workflowRuns,
        pagination: {
          totalItems: total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          pageSize: limit,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getOneWorkflowRunById(id: string, userId: string) {
    try {
      const workflowRun = await this.prisma.workflowRun.findFirst({
        where: {
          id,
          workflow: {
            userId,
          },
        },
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
              eventType: true,
            },
          },
        },
      });

      if (!workflowRun) {
        throw new NotFoundException('Workflow run not found');
      }

      return workflowRun;
    } catch (error) {
      throw error;
    }
  }
}
