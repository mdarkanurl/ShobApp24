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
  Req} from "@nestjs/common";
import { ActionService } from "./action.service";
import { ZodValidationPipe } from "src/pipes/zod-validation.pipe";
import { type createActionDto, createActionSchema } from "./dto/create-action.dto";
import { type Request } from "express";

@Controller({ path: "action", version: "1" })
export class ActionController {
  constructor(private readonly actionService: ActionService) {}

  @Get(":workflowId")
  @HttpCode(HttpStatus.OK)
  async getAllActionsByWorkflowId(
    @Req() req: Request,
    @Param("workflowId") workflowId: string,
  ) {
    try {
      const userId = req.session.user.id;

      const actions = await this.actionService
        .getAllActionsByWorkflowId(workflowId, userId);

      return {
        success: true,
        message: "Actions successfully retrieved",
        data: actions,
        error: null,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to retrieve actions");
    }
  }

  @Post(':workflowId')
  @HttpCode(HttpStatus.CREATED)
  async createAction(
    @Req() req: Request,
    @Param('workflowId') workflowId: string,
    @Body(new ZodValidationPipe(createActionSchema))
    body: createActionDto
  ) {
    try {
      const userId = req.session.user.id;

      const action = await this.actionService
        .createAction(workflowId, userId, body);

      return {
        success: true,
        message: "Action successfully created",
        data: action,
        error: null
      }
    } catch (error) {
      throw error instanceof HttpException
      ? error
      : new InternalServerErrorException("Failed to create action");
    }
  }
}
