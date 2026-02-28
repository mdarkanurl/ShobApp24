import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  HttpStatus,
  HttpCode,
  Query,
  UsePipes,
  HttpException,
  InternalServerErrorException,
  Param,
  BadRequestException,
  Headers
} from "@nestjs/common";
import { AuthServiceLocal } from "./auth.service";
import type { Response, Request } from "express";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { type CreateUserDto, createUserSchema } from "./dto/create.signUpEmail.dto";
import { loginSchema, type loginSchemaDto } from "./dto/create.login.dto";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import { type verifyEmailDto, verifyEmailSchema } from "./dto/create.email-verification.dto";
import { resendVerifyEmailSchema, type resendVerifyEmailSchemaDto } from "./dto/create.resend-email-verification.dto";
import { requestPasswordResetSchema, type requestPasswordResetSchemaDto } from "./dto/create.request.password.reset.dto";
import { resetPasswordSchema } from "./dto/create.reset.password.dto";
import { changePasswordSchema, type changePasswordSchemaDto } from "./dto/create.change.password.dto";

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private authService: AuthServiceLocal
  ) {}

  @Post('/sign-up/email')
  @AllowAnonymous()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createUserSchema))
  async signup(@Body() body: CreateUserDto, @Res() res: Response) {
    try {
      await this.authService.signUp(body);

      res.json({
        success: true,
        message: "User created",
        data: null,
        error: null
      });
    } catch (error) {
      if(error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Fail to create user");
    }
  }

  @Get('verify-email')
  @AllowAnonymous()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(verifyEmailSchema))
  async verifyEmail(
    @Query() token: verifyEmailDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const data = await this.authService.verifyEmail(token, req);

      if (data) {
        res.setHeader('Set-Cookie', data);
      }

      res.json({
        success: true,
        message: "Email verified successfully",
        data: null,
        error: null
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Email verification failed");
    }
  }

  @Post('/sign-in/email')
  @AllowAnonymous()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() body: loginSchemaDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      const data = await this.authService.login(body, req);

      if (data) {
        res.setHeader('Set-Cookie', data);
      }

      res.json({
        success: true,
        message: "You've logged in successfully",
        data: null,
        error: null
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Email verification failed");
    }
  }

  @Post('resend-verify-email')
  @AllowAnonymous()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resendVerifyEmailSchema))
  async resendVerifyEmail(
    @Body() body: resendVerifyEmailSchemaDto,
    @Res() res: Response
  ) {
    try {
      await this.authService.resendVerifyEmail(body);

      res.json({
        success: true,
        message: "The email has been sent",
        data: null,
        error: null
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Email verification failed");
    }
  }

  @Post('/sign-out')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const sessionToken: string = req.cookies['better-auth.session_token'];

      if (!sessionToken) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'No session token provided',
        });
      }

      await this.authService.logout(sessionToken, req);

      // Clear cookies on response
      res.clearCookie('better-auth.session_token');

      res.json({
        success: true,
        message: "Logged out successfully",
        data: null,
        error: null
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Logout failed");
    }
  }

  @Post('request-password-reset')
  @AllowAnonymous()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(requestPasswordResetSchema))
  async requestPasswordReset(
    @Body() body: requestPasswordResetSchemaDto,
    @Res() res: Response
  ) {
    try {
      await this.authService.requestPasswordReset(body);

      res.json({
        success: true,
        message: "Check your email for the reset link",
        data: null,
        error: null
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Request password reset failed");
    }
  }

  @Post('reset-password/:token')
  @AllowAnonymous()
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('token') token: string,
    @Body('password') password: string,
    @Res() res: Response
  ) {
    try {
      const result = resetPasswordSchema.safeParse({ token, password });

      if (!result.success) {
        throw new BadRequestException(result.error.issues);
      }

      await this.authService.resetPassword({
        token: result.data.token,
        password: result.data.password
      });

      res.json({
        success: true,
        message: "The password has been changed",
        data: null,
        error: null
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Password reset failed");
    }
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  async changePassword(
    @Body() body: changePasswordSchemaDto,
    @Headers() headers: any,
    @Res() res: Response
  ) {
    try {
      await this.authService.changePassword(
        headers,
        body
      );

      res.json({
        success: true,
        message: "The password has been changed",
        data: null,
        error: null
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to change the password");
    }
  }

  @Get('/get-session')
  @HttpCode(HttpStatus.OK)
  async getSession(
    @Headers() headers: any,
  ) {
    try {
      return await this.authService.getSession(headers);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to get session");
    }
  }
}
