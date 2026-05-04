import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActionRunService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllActionRuns(
    userId: string,
    workflowId: string,
    limit: number,
    page: number
  ) {
    try {
      const skip = (page - 1) * limit;

      // find the workflow and all the actions under that workflow
      const workflow = await this.prisma.workflow.findFirst({
        where: {
          id: workflowId,
          userId,
        },
        select: {
          id: true,
          runs: {
            select: {
              id: true,
            },
          },
        }
      });

      if(!workflow) throw new NotFoundException('workflow not found');
      if(!workflow.runs.length) throw new NotFoundException('no run data found');

      const runIds = workflow.runs.map((run) => run.id);

      const whereClause = {
        workflowRunId: { in: runIds }
      };

      const [total, actionRuns] = await this.prisma.$transaction([
        this.prisma.actionRun.count({
          where: whereClause,
        }),
        this.prisma.actionRun.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { startedAt: 'desc' },
          omit: {
            input: true,
            output: true,
            error: true
          }
        }),
      ]);

      return {
        data: actionRuns,
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

  async getOneActionRunById(
    id: string,
    userId: string
  ) {
    try {
      const actionRun = await this.prisma.actionRun.findFirst({
        where: {
          id,
          workflowRun: {
            workflow: {
              userId,
            },
          },
        },
        include: {
          action: true,
          workflowRun: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              finishedAt: true,
            },
          },
        },
      });

      if (!actionRun) {
        throw new NotFoundException('Action run not found');
      }

      return actionRun;
    } catch (error) {
      throw error;
    }
  }
}
