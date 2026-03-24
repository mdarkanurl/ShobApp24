import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Post,
  Req,
  UsePipes,
} from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { ZodValidationPipe } from "src/pipes/zod-validation.pipe";
import { createWorkflowSchema, type createWorkflowSchemaDto } from "./dto/create-workflow.dto";
import { UUID } from "crypto";
import { type Request } from "express";
import { RateLimit } from "src/rate-limit/rate-limit.decorator";

@Controller({ path: "workflow", version: "1" })
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @RateLimit({ points: 15, duration: 60 })
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
