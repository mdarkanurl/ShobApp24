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
  Post,
  Put,
  Req,
} from "@nestjs/common";
import { type Request } from "express";
import { ActionService } from "./action.service";
import { type createActionDto } from "./dto/create-action.dto";
import { type UpdateActionByIdDto } from "./dto/update-action.dto";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { CheckLimit } from "../decorators/check-limit.decorator";

@Controller({ path: "action", version: "1" })
export class ActionController {
  constructor(private readonly actionService: ActionService) {}

  @Get(":workflowId")
  @RateLimit({ points: 15, duration: 60 })
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

  @Post(":workflowId")
  @CheckLimit("actions_per_workflow")
  @RateLimit({ points: 15, duration: 60 })
  @HttpCode(HttpStatus.CREATED)
  async createAction(
    @Req() req: Request,
    @Param("workflowId") workflowId: string,
    @Body()
    body: createActionDto,
  ) {
    try {
      const userId = req.session.user.id;

      const action = await this.actionService
        .createAction(workflowId, userId, body);

      return {
        success: true,
        message: "Action successfully created",
        data: action,
        error: null,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to create action");
    }
  }

  @Get("id/:id")
  @RateLimit({ points: 15, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async getOneActionById(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    try {
      const userId = req.session.user.id;

      const action = await this.actionService
        .getOneActionById(id, userId);

      return {
        success: true,
        message: "Action successfully retrieved",
        data: action,
        error: null,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to retrieve action");
    }
  }

  @Put("id/:id")
  @RateLimit({ points: 15, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async updateActionById(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateActionByIdDto
  ) {
    try {
      const userId: string = req.session.user.id;

      const actions = await this.actionService
        .updateActionById(userId, body, id);

      return {
        success: true,
        message: "Actions updated successfully",
        data: actions,
        error: null,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to delete actions");
    }
  }

  @Delete(":workflowId")
  @RateLimit({ points: 15, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async deleteAllActionsByWorkflowId(
    @Req() req: Request,
    @Param("workflowId") workflowId: string,
  ) {
    try {
      const userId = req.session.user.id;

      const actions = await this.actionService
        .deleteAllActionsByWorkflowId(workflowId, userId);

      return {
        success: true,
        message: "Actions deleted successfully",
        data: actions,
        error: null,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to delete actions");
    }
  }

  @Delete("id/:id")
  @RateLimit({ points: 15, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async deleteActionById(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    try {
      const userId = req.session.user.id;

      const action = await this.actionService
        .deleteActionById(id, userId);

      return {
        success: true,
        message: "Action deleted successfully",
        data: action,
        error: null,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException("Failed to delete action");
    }
  }
}
