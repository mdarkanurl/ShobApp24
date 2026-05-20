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
import { verifyGitHubWebhook } from "../utils/verify-webhook-request";
import { ConfigService } from "@nestjs/config";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { EventType } from "@prisma/client";

@Controller({ path: 'github', version: '1' })
export class GithubController{
    private readonly maxLimit: number;
    private readonly githubSecret: string;
    constructor(
      private readonly githubService: GithubService,
      private readonly configService: ConfigService
    ) {
      const maxLimitValue = this.configService.get<number>('MAX_LIMIT');
      this.maxLimit =
        typeof maxLimitValue === 'number' && !Number.isNaN(maxLimitValue)
          ? maxLimitValue
          : 100;
      this.githubSecret =
        this.configService.get<string>('GITHUB_SECRET') || 'GitHub_secret';
    }

    @Post('connect')
    @RateLimit({ points: 15, duration: 60 })
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
        const signature = req.headers["x-hub-signature-256"];
        const rawBody = req.body;

        if (Array.isArray(signature)) {
          throw new BadRequestException("Invalid GitHub signature header");
        }

        if (!Buffer.isBuffer(rawBody)) {
          throw new BadRequestException("Invalid webhook payload");
        }

        const isValid = verifyGitHubWebhook(rawBody, signature, this.githubSecret);

        if (!isValid) {
          throw new BadRequestException("Invalid webhook signature");
        }

        let data: any;
        try {
          data = JSON.parse(rawBody.toString("utf-8"));
        } catch (error) {
          throw new BadRequestException("Invalid JSON payload");
        }

        const event = req.headers["x-github-event"] as EventType;
        await this.githubService
          .receiveWebhookFromGitHub(data, event);

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

    @Get('repos')
    @RateLimit({ points: 10, duration: 60 })
    @HttpCode(HttpStatus.OK)
    async getAllUserRepo(
      @Req() req: Request,
      @Query() query: any
    ) {
      try {
        const userId: UUID = req.session.user.id;
        const page = Math.max(parseInt(query.page) || 1, 1);
        const limit = Math.max(parseInt(query.limit) || 10, 1);

        if(limit >= this.maxLimit) {
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
