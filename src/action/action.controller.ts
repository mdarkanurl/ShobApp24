import {
  Body,
  Controller,
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
