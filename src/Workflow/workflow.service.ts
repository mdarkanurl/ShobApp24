import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UUID } from "crypto";
import { PrismaService } from "src/prisma/prisma.service";
import { createWorkflowSchemaDto } from "./dto/create-workflow.dto";

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
          id
        }
      });

      if(!workflow || workflow.userId !== userId) {
        throw new NotFoundException();
      }

      return workflow;
    } catch (error) {
      throw error;
    }  
  }
}
