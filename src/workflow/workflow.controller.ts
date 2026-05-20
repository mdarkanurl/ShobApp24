import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Patch,
  Param,
  Post,
  Query,
  Req,
  UsePipes,
} from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import { createWorkflowSchema, type createWorkflowSchemaDto } from "./dto/create-workflow.dto";
import { updateWorkflowSchema, type updateWorkflowSchemaDto } from "./dto/update-workflow.dto";
import {
  deleteManyWorkflowSchema,
  type deleteManyWorkflowSchemaDto
} from "./dto/delete-many-workflow.dto";
import { UUID } from "crypto";
import { type Request } from "express";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { ConfigService } from "@nestjs/config";
import { CheckLimit } from "../decorators/check-limit.decorator";

@Controller({ path: "workflow", version: "1" })
export class WorkflowController {
  private readonly maxLimit: number;

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly configService: ConfigService
  ) {
    const maxLimitValue = this.configService.get<number>("MAX_LIMIT");
    this.maxLimit =
      typeof maxLimitValue === "number" && !Number.isNaN(maxLimitValue)
        ? maxLimitValue
        : 100;
  }

  @Post()
  @RateLimit({ points: 15, duration: 60 })
  @CheckLimit("workflows")
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createWorkflowSchema))
  async createWorkflow(
    @Req() req: Request,
    @Body() body: createWorkflowSchemaDto
  ) {
    try {
      const userId: UUID = req.session.user.id;

      const workflow = await this.workflowService
        .createWorkflow(userId, body);

      return {
        success: true,
        message: "Workflow created successfully",
        data: workflow,
        error: null
      }
    } catch (error) {
      throw error instanceof HttpException
      ? error
      : new InternalServerErrorException("Failed to create workflow");
    }
  }

  @Get()
  @RateLimit({ points: 30, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async getAllWorkflow(
    @Req() req: Request,
    @Query() query: any
  ) {
    try {
      const userId: UUID = req.session.user.id;
      const page = Math.max(parseInt(query.page) || 1, 1);
      const limit = Math.max(parseInt(query.limit) || 10, 1);

      if (limit >= this.maxLimit) {
        throw new BadRequestException("Limit is too big");
      }

      const workflow = await this.workflowService
        .getAllWorkflow(userId, limit, page);

      return {
        success: true,
        message: "Here's the workflow data",
        data: workflow,
        error: null
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to retrieve workflows");
    }
  }

  @Patch(":id")
  @RateLimit({ points: 10, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async updateWorkflow(
    @Req() req: Request,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateWorkflowSchema))
    body: updateWorkflowSchemaDto
  ) {
    try {
      const userId: UUID = req.session.user.id;

      const workflow = await this.workflowService
        .updateWorkflow(id, userId, body);

      return {
        success: true,
        message: "Workflow updated successfully",
        data: workflow,
        error: null
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to update workflow");
    }
  }

  @Delete(":id")
  @RateLimit({ points: 10, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async deleteOneWorkflowById(
    @Req() req: Request,
    @Param("id") id: string
  ) {
    try {
      const userId: UUID = req.session.user.id;

      const workflow = await this.workflowService
        .deleteOneWorkflowById(id, userId);

      return {
        success: true,
        message: "Workflow deleted successfully",
        data: workflow,
        error: null
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to delete workflow");
    }
  }

  @Delete()
  @RateLimit({ points: 10, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async deleteManyWorkflow(
    @Req() req: Request,
    @Body(new ZodValidationPipe(deleteManyWorkflowSchema))
    body: deleteManyWorkflowSchemaDto
  ) {
    try {
      const userId: UUID = req.session.user.id;

      const workflow = await this.workflowService
        .deleteManyWorkflow(userId, body.ids);

      return {
        success: true,
        message: "Workflows deleted successfully",
        data: workflow,
        error: null
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to delete workflows");
    }
  }

  @Get(':id')
  @RateLimit({ points: 30, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async getOneWorkflowById(
    @Req() req: Request,
    @Param('id') id: string
  ) {
    try {
      const userId: UUID = req.session.user.id;

      const workflow = await this.workflowService
        .getOneWorkflowById(id, userId);

      return {
        success: true,
        message: "Workflow successfully retrieve",
        data: workflow,
        error: null
      }
    } catch (error) {
      throw error instanceof HttpException
      ? error
      : new InternalServerErrorException("Failed to retrieve workflow");
    }
  }
}

