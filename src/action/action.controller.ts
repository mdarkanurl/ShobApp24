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
  Req,
} from "@nestjs/common";
import { type Request } from "express";
import { ActionService } from "./action.service";
import { type createActionDto } from "./dto/create-action.dto";

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

  @Post(":workflowId")
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

  @Delete(":workflowId")
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
