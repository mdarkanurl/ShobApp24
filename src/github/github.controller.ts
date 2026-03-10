import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { GithubService } from "./github.service";
import { UUID } from "crypto";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

@Controller({ path: 'github', version: '1' })
export class GithubController{
    constructor(
      private readonly githubService: GithubService,
      private readonly MAX_LIMIT = Number(process.env.MAX_LIMIT) || 100
    ) {}

    @Post('connect')
    @HttpCode(HttpStatus.OK)
    async connect(
      @Req() req: Request,
      @Res() res: Response
    ) {
        try {
            const userId: UUID = req.session.user.id;
            const data = await this.githubService.connect(userId);

            res.json({
              success: true,
              message: "GitHub connect URL generated",
              data,
              error: null
            });
        } catch (error) {
          throw error instanceof HttpException
            ? error
            : new InternalServerErrorException("Failed to initialize GitHub connection");
        }
    }

    @Get('callback')
    @HttpCode(HttpStatus.OK)
    async callback(
      @Query('installation_id') installation_id: number,
      @Query('state') state: string,
      @Req() req: Request,
      @Res() res: Response
    ) {
      try {
        const userId: UUID = req.session.user.id;
        const data = await this.githubService.callback({ installation_id, state }, userId);

        res.json({
          success: true,
          message: "GitHub account connected successfully",
          data,
          error: null
        });
      } catch (error) {
        throw error instanceof HttpException
          ? error
          : new InternalServerErrorException("Failed to complete GitHub connect callback");
      }
    }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @AllowAnonymous()
    async receiveWebhookFromGitHub(
      @Req() req: Request
    ) {
      try {
        const data = req.body;
        await this.githubService
          .receiveWebhookFromGitHub(data);

        return {
          success: true,
          message: "Webhook data received successfully",
          data: null,
          error: null
        }
      } catch (error) {
        throw error instanceof HttpException
          ? error
          : new InternalServerErrorException("Internal server error");
      }
    }

    @Get(':repos')
    @HttpCode(HttpStatus.OK)
    async getAllUserRepo(
      @Req() req: Request,
      @Query() query: any
    ) {
      try {
        const userId: UUID = req.session.user.id;
        const page = Math.max(parseInt(query.page) || 1, 1);
        const limit = Math.max(parseInt(query.limit) || 10, 1);

        if(limit >= this.MAX_LIMIT) {
          throw new BadRequestException('Limit is too big');
        }

        const data = await this.githubService
          .getAllUserRepo(userId, limit, page);

        return {
          success: true,
          message: "Here's the repo data",
          data,
          error: null
        };
      } catch (error) {
        throw error instanceof HttpException
          ? error
          : new InternalServerErrorException("Failed to get all repo");
      }
    }

}
