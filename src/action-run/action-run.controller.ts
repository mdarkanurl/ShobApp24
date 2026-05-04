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
import { ActionRunService } from './action-run.service';
import { type Request } from 'express';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { ConfigService } from '@nestjs/config';

@Controller({ path: 'action-run', version: '1' })
export class ActionRunController {
  private readonly maxLimit: number;

  constructor(
    private readonly actionRunService: ActionRunService,
    private readonly configService: ConfigService,
  ) {
    const maxLimitValue = this.configService.get<number>('MAX_LIMIT');
    this.maxLimit =
      typeof maxLimitValue === 'number' && !Number.isNaN(maxLimitValue)
        ? maxLimitValue
        : 100;
  }

  @Get(":workflowId")
  @RateLimit({ points: 30, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async getAllActionRuns(
    @Req() req: Request,
    @Query() query: any,
    @Param('workflowId') workflowId: string
  ) {
    try {
      const userId: string = req.session.user.id;
      const page = Math.max(parseInt(query.page) || 1, 1);
      const limit = Math.max(parseInt(query.limit) || 10, 1);

      if (limit >= this.maxLimit) {
        throw new BadRequestException('Limit is too big');
      }

      const actionRun = await this.actionRunService.getAllActionRuns(
        userId,
        workflowId,
        limit,
        page,
      );

      return {
        success: true,
        message: "Here's the action run data",
        data: actionRun,
        error: null,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('Failed to retrieve action runs');
    }
  }

  @Get('/one/:id')
  @RateLimit({ points: 30, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async getOneActionRunById(
    @Req() req: Request,
    @Param('id') id: string
  ) {
    try {
      const userId: string = req.session.user.id;

      const actionRun = await this.actionRunService.getOneActionRunById(
        id,
        userId,
      );

      return {
        success: true,
        message: 'Action run successfully retrieve',
        data: actionRun,
        error: null,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('Failed to retrieve action run');
    }
  }
}
