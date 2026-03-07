import {
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

@Controller({ path: 'github', version: '1' })
export class GithubController{
    constructor(
      private readonly githubService: GithubService
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
              message: "GitHub authorization URL generated",
              data,
              error: null
            });
        } catch (error) {
          throw error instanceof HttpException
            ? error
            : new InternalServerErrorException("Failed to initialize GitHub OAuth");
        }
    }

    @Get('callback')
    @HttpCode(HttpStatus.OK)
    async callback(
      @Query('code') code: string,
      @Query('state') state: string,
      @Req() req: Request,
      @Res() res: Response
    ) {
      try {
        const userId: UUID = req.session.user.id;
        const data = await this.githubService.callback({ code, state }, userId);

        res.json({
          success: true,
          message: "GitHub account connected successfully",
          data,
          error: null
        });
      } catch (error) {
        throw error instanceof HttpException
          ? error
          : new InternalServerErrorException("Failed to complete GitHub OAuth callback");
      }
    }

}
