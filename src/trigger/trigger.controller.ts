import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Req } from "@nestjs/common";
import { TriggerService } from "./trigger.service";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import { type CreateTriggerDto, createTriggerSchema } from "./dto/create-trigger.dto";
import { type Request } from "express";
import { type UpdateTriggerDto, updateTriggerSchema } from "./dto/update-trigger.dto";

@Controller({ path: "trigger", version: "1" })
export class TriggerController {
  constructor(private readonly triggerService: TriggerService) {}

  @Post(':workflowId')
  @RateLimit({ points: 10, duration: 60 })
  @HttpCode(HttpStatus.CREATED)
  async createTrigger(
    @Param('workflowId') workflowId: string,
    @Body(new ZodValidationPipe(createTriggerSchema)) body: CreateTriggerDto
  ) {
    try {
      const trigger = await this.triggerService
        .createTrigger(workflowId, body);

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

  @Get("id/:id")
  @RateLimit({ points: 30, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async getOneTriggerById(
    @Req() req: Request,
    @Param("id") id: string
  ) {
    try {
      const userId = req.session.user.id;
      const trigger = await this.triggerService
        .getOneTriggerById(id, userId);

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

  @Patch(":id")
  @RateLimit({ points: 10, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async updateTriggerById(
    @Req() req: Request,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTriggerSchema))
    body: UpdateTriggerDto
  ) {
    try {
      const userId = req.session.user.id;
      const trigger = await this.triggerService
        .updateTriggerById(id, userId, body);

      return {
        success: true,
        message: "Trigger successfully updated",
        data: trigger,
        error: null
      };
    } catch (error) {
      throw error instanceof HttpException
      ? error
      : new InternalServerErrorException("Failed to update trigger");
    }
  }

  @Delete(":workflowId")
  @RateLimit({ points: 10, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async deleteTriggerByWorkflowId(
    @Req() req: Request,
    @Param("workflowId") workflowId: string
  ) {
    try {
      const userId = req.session.user.id;
      const trigger = await this.triggerService
        .deleteTriggerByWorkflowId(workflowId, userId);

      return {
        success: true,
        message: "Trigger deleted successfully",
        data: trigger,
        error: null
      };
    } catch (error) {
      throw error instanceof HttpException
      ? error
      : new InternalServerErrorException("Failed to delete trigger");
    }
  }

  @Delete("id/:id")
  @RateLimit({ points: 10, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async deleteTriggerById(
    @Req() req: Request,
    @Param("id") id: string
  ) {
    try {
      const userId = req.session.user.id;
      const trigger = await this.triggerService
        .deleteTriggerById(id, userId);

      return {
        success: true,
        message: "Trigger deleted successfully",
        data: trigger,
        error: null
      };
    } catch (error) {
      throw error instanceof HttpException
      ? error
      : new InternalServerErrorException("Failed to delete trigger");
    }
  }
}
