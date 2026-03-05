import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { GithubService } from "./github.service";

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
            const data = await this.githubService.connect(req.headers as any);

            res.json({
              success: true,
              message: "GitHub authorization URL generated",
              data,
              error: null
            });
        } catch (error) {
          throw error instanceof Error
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
        const data = await this.githubService.callback({ code, state }, req.headers as any);

        res.json({
          success: true,
          message: "GitHub account connected successfully",
          data,
          error: null
        });
      } catch (error) {
        throw error instanceof Error
          ? error
          : new InternalServerErrorException("Failed to complete GitHub OAuth callback");
      }
    }

}
