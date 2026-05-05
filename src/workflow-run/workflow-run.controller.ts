import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { WorkflowRunService } from './workflow-run.service';
import { type Request } from 'express';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { ConfigService } from '@nestjs/config';
import { getAllWorkflowRunsSchema, type GetAllWorkflowRunsSchemaDto } from './dto/get-all-workflow-run.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

@Controller({ path: 'workflow-run', version: '1' })
export class WorkflowRunController {
  private readonly maxLimit: number;

  constructor(
    private readonly workflowRunService: WorkflowRunService,
    private readonly configService: ConfigService,
  ) {
    const maxLimitValue = this.configService.get<number>('MAX_LIMIT');
    this.maxLimit =
      typeof maxLimitValue === 'number' && !Number.isNaN(maxLimitValue)
        ? maxLimitValue
        : 100;
  }

  @Get(':workflowId')
  @RateLimit({ points: 30, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async getAllWorkflowRuns(
    @Req() req: Request,
    @Query(new ZodValidationPipe(getAllWorkflowRunsSchema))
    query: GetAllWorkflowRunsSchemaDto,
    @Param('workflowId') workflowId: string,
  ) {
    try {
      const userId: string = req.session.user.id;
      const { page, limit, status } = query;

      if (limit >= this.maxLimit) {
        throw new BadRequestException('Limit is too big');
      }

      const workflowRun = await this.workflowRunService.getAllWorkflowRuns(
        userId,
        workflowId,
        limit,
        page,
        status
      );

      return {
        success: true,
        message: "Here's the workflow run data",
        data: workflowRun,
        error: null,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('Failed to retrieve workflow runs');
    }
  }

  @Get('/one/:id')
  @RateLimit({ points: 30, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async getOneWorkflowRunById(@Req() req: Request, @Param('id') id: string) {
    try {
      const userId: string = req.session.user.id;

      const workflowRun = await this.workflowRunService.getOneWorkflowRunById(
        id,
        userId,
      );

      return {
        success: true,
        message: 'Workflow run successfully retrieve',
        data: workflowRun,
        error: null,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('Failed to retrieve workflow run');
    }
  }
}
