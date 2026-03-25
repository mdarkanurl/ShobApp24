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
  Req } from "@nestjs/common";
import { TriggerService } from "./trigger.service";
import { RateLimit } from "src/rate-limit/rate-limit.decorator";
import { ZodValidationPipe } from "src/pipes/zod-validation.pipe";
import { type CreateTriggerDto, createTriggerSchema } from "./dto/create-trigger.dto";
import { type Request } from "express";

@Controller({ path: "trigger", version: "1" })
export class TriggerController {
  constructor(private readonly triggerService: TriggerService) {}

  @Post(':workflowId')
  @RateLimit({ points: 10, duration: 60 })
  @HttpCode(HttpStatus.CREATED)
  async createTrigger(
    @Req() req: Request,
    @Param('workflowId') workflowId: string,
    @Body(new ZodValidationPipe(createTriggerSchema)) body: CreateTriggerDto
  ) {
    try {
      const userId = req.session.user.id;
      const trigger = await this.triggerService
        .createTrigger(workflowId, userId, body);

      return {
        success: true,
        message: "Trigger successfully created",
        data: trigger,
        error: null
      }
    } catch (error) {
      throw error instanceof HttpException
      ? error
      : new InternalServerErrorException("Failed to create trigger");
    }
  }

  @Get(":workflowId")
  @RateLimit({ points: 30, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async getTriggerByWorkflowId(
    @Req() req: Request,
    @Param("workflowId") workflowId: string
  ) {
    try {
      const userId = req.session.user.id;
      const trigger = await this.triggerService
        .getTriggerByWorkflowId(workflowId, userId);

      return {
        success: true,
        message: "Trigger successfully retrieved",
        data: trigger,
        error: null
      };
    } catch (error) {
      throw error instanceof HttpException
      ? error
      : new InternalServerErrorException("Failed to retrieve trigger");
    }
  }
}
