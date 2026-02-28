import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import { Request } from "express";
import { CreateUserDto } from "./dto/create.signUpEmail.dto";
import { loginSchemaDto } from "./dto/create.login.dto";
import { verifyEmailDto } from "./dto/create.email-verification.dto";
import { resendVerifyEmailSchemaDto } from "./dto/create.resend-email-verification.dto";
import { PrismaService } from "../prisma/prisma.service";
import { redis } from "../redis";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { requestPasswordResetSchemaDto } from "./dto/create.request.password.reset.dto";
import { resetPasswordSchemaSchemaDto } from "./dto/create.reset.password.dto";
import { changePasswordSchemaDto } from "./dto/create.change.password.dto";

@Injectable()
export class AuthServiceLocal {
  constructor(
    private prisma: PrismaService,
    private readonly auth: AuthService
  ) {}
  async signUp(body: CreateUserDto) {
    try {
      const user = await this.auth.api.signUpEmail({
        body,
        asResponse: true,
      });

      if(user.status === 422) {
        throw new ConflictException('User already exists');
      }

      if(user.status === 400) {
        throw new BadRequestException('Password is too short');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async verifyEmail(
    token: verifyEmailDto,
    req: Request
  ) {
    try {
      const result = await this.auth.api.verifyEmail({
        query: token,
        asResponse: true,
        headers: req.headers as any
      });

      if(result.status === 401) {
        throw new BadRequestException('token expired or invalid');
      } else if(result.status >= 500) {
        throw new HttpException('Server error', 500);
      }

      const cookie = result.headers.get('set-cookie');
      return cookie;
    } catch (error) {
      throw error;
    }
  }

  async login(
    body: loginSchemaDto,
    req: Request
  ) {
    try {
      const res = await this.auth.api.signInEmail({
        body,
        asResponse: true,
        headers: req.headers as any
      });

      if(res.status === 401) {
        throw new BadRequestException(
          "User not found or invalid password"
        );
      }

      if(res.status === 403) {
        throw new HttpException("Email not verifyed", res.status)
      }

      const cookie = res.headers.get('set-cookie');
      return cookie;
    } catch (error) {
      throw error;
    }
  }

  async resendVerifyEmail(data: resendVerifyEmailSchemaDto) {
    try {
      // Check User Existence and Verification Status
      const user = await this.prisma.user.findUnique({
        where: {
          email: data.email,
          emailVerified: false
        }
      });

      if(!user) {
        throw new BadRequestException(
          "Account already verified or account doesn't exist"
        );
      }

      const dataFromRedis = await redis.get(`sendVerificationEmail:${user.id}`);
      if(dataFromRedis) {
        throw new BadRequestException("Previous token is not expired");
      }

      const res = await this.auth.api.sendVerificationEmail({
        body: {
          email: data.email,
          callbackURL: "/"
        }
      });

      if(!res.status) {
        throw new HttpException("Failed to send email", 500);
      }
    } catch (error) {
      throw error;
    }
  }

  async logout(
    sessionToken: string,
    req: Request
  ) {
    try {
      const res = await this.auth.api.revokeSession({
        body: {
          token: sessionToken
        },
        headers: req.headers as any,
      });

      if(!res) {
        throw new InternalServerErrorException("Fali to revoke session");
      }

      return res;
    } catch (error) {
      throw error;
    }
  }

  async requestPasswordReset(
    body: requestPasswordResetSchemaDto
  ) {
    try {
      const user = await this.prisma.user.count({
        where: {
          email: body.email
        }
      });

      if(user === 0 ) {
        throw new BadRequestException(`User not found`);
      }

      const dataFromRedis = await redis.get(`sendResetPasswordEmail:${body.email}`);
      if(dataFromRedis) {
        throw new BadRequestException("Previous token is not expired");
      }

      const data = await this.auth.api.requestPasswordReset({
          body: {
            email: body.email,
          }
      });

      return data;
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(
    body: resetPasswordSchemaSchemaDto
  ) {
    try {
      const data = await this.auth.api.resetPassword({
          body: {
            newPassword: body.password,
            token: body.token
          },
      });

      return data;
    } catch (error: any) {
      if (
        error?.statusCode === 400 &&
        error?.body?.code === "INVALID_TOKEN"
      ) {
        throw new BadRequestException("Reset token is invalid or expired");
      }
      throw error;
    }
  }

  async changePassword(
    headers: any,
    body: changePasswordSchemaDto
  ) {
    try {
      const data = await this.auth.api.changePassword({
          body: {
              newPassword: body.newPassword,
              currentPassword: body.currentPassword,
              revokeOtherSessions: true,
          },
          headers: headers,
          asResponse: true,
      });

      if(data.status === 400) {
        throw new BadRequestException("invalid password");
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async getSession(
    headers: any,
  ) {
    try {
      const user = await this.auth.api.getSession({ headers });

      if(!user) {
        throw new NotFoundException("No session data found");
      }

      return {
        user: {
          name: user.user.name,
          email: user.user.email,
          emailVerified: user.user.emailVerified
        },
        session: {
          expiresAt: user.session.expiresAt
        }
      }
    } catch (error) {
      throw error;
    }
  }
}
