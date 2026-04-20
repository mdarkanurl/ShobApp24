import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { PrismaService } from "../prisma/prisma.service";
import { redis } from "../redis";
import { AuthServiceLocal } from "./auth.service";

jest.mock("@thallesp/nestjs-better-auth", () => ({
  AuthService: class AuthService {},
}));

jest.mock("../redis", () => ({
  redis: {
    get: jest.fn(),
  },
}));

type BetterAuthApiMock = Record<string, jest.Mock>;

describe("AuthServiceLocal", () => {
  let service: AuthServiceLocal;
  let authApiMock: BetterAuthApiMock;
  let prismaMock: {
    user: {
      findUnique: jest.Mock;
      count: jest.Mock;
    };
  };
  let redisGetMock: jest.Mock;

  beforeEach(async () => {
    authApiMock = {
      signUpEmail: jest.fn(),
      getSession: jest.fn(),
      signInEmail: jest.fn(),
      verifyEmail: jest.fn(),
      sendVerificationEmail: jest.fn(),
      revokeSession: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
    };

    prismaMock = {
      user: {
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };

    redisGetMock = redis.get as jest.Mock;
    redisGetMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthServiceLocal,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AuthService,
          useValue: {
            api: authApiMock,
          },
        },
      ],
    }).compile();

    service = module.get<AuthServiceLocal>(AuthServiceLocal);
  });

  describe("signUp", () => {
    const body = {
      email: "test@example.com",
      name: "Test User",
      password: "password123",
    };

    it("returns auth response on success", async () => {
      const response = { status: 201 };
      authApiMock.signUpEmail.mockResolvedValue(response);

      await expect(service.signUp(body)).resolves.toBe(response);
      expect(authApiMock.signUpEmail).toHaveBeenCalledWith({
        body,
        asResponse: true,
      });
    });

    it("throws ConflictException when signUpEmail returns 422", async () => {
      authApiMock.signUpEmail.mockResolvedValue({ status: 422 });

      await expect(service.signUp(body)).rejects.toBeInstanceOf(ConflictException);
    });

    it("throws BadRequestException when signUpEmail returns 400", async () => {
      authApiMock.signUpEmail.mockResolvedValue({ status: 400 });

      await expect(service.signUp(body)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rethrows upstream errors", async () => {
      const error = new Error("upstream");
      authApiMock.signUpEmail.mockRejectedValue(error);

      await expect(service.signUp(body)).rejects.toBe(error);
    });
  });

  describe("verifyEmail", () => {
    const token = { token: "abc-token" };
    const req = { headers: { cookie: "x=y" } } as any;

    it("returns set-cookie header when successful", async () => {
      const get = jest.fn().mockReturnValue("session=1; Path=/; HttpOnly");
      authApiMock.verifyEmail.mockResolvedValue({
        status: 200,
        headers: { get },
      });

      await expect(service.verifyEmail(token as any, req)).resolves.toBe(
        "session=1; Path=/; HttpOnly"
      );
      expect(authApiMock.verifyEmail).toHaveBeenCalledWith({
        query: token,
        asResponse: true,
        headers: req.headers,
      });
      expect(get).toHaveBeenCalledWith("set-cookie");
    });

    it("throws BadRequestException when response status is 401", async () => {
      authApiMock.verifyEmail.mockResolvedValue({
        status: 401,
        headers: { get: jest.fn() },
      });

      await expect(service.verifyEmail(token as any, req)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("throws HttpException when response status is 500 or higher", async () => {
      authApiMock.verifyEmail.mockResolvedValue({
        status: 500,
        headers: { get: jest.fn() },
      });

      await expect(service.verifyEmail(token as any, req)).rejects.toBeInstanceOf(
        HttpException
      );
    });
  });

  describe("login", () => {
    const body = {
      email: "test@example.com",
      password: "password123",
    };
    const req = { headers: { cookie: "x=y" } } as any;

    it("returns set-cookie header when successful", async () => {
      const get = jest.fn().mockReturnValue("session=1; Path=/; HttpOnly");
      authApiMock.signInEmail.mockResolvedValue({
        status: 200,
        headers: { get },
      });

      await expect(service.login(body, req)).resolves.toBe(
        "session=1; Path=/; HttpOnly"
      );
      expect(authApiMock.signInEmail).toHaveBeenCalledWith({
        body,
        asResponse: true,
        headers: req.headers,
      });
      expect(get).toHaveBeenCalledWith("set-cookie");
    });

    it("throws BadRequestException when login returns 401", async () => {
      authApiMock.signInEmail.mockResolvedValue({
        status: 401,
        headers: { get: jest.fn() },
      });

      await expect(service.login(body, req)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("throws HttpException when login returns 403", async () => {
      authApiMock.signInEmail.mockResolvedValue({
        status: 403,
        headers: { get: jest.fn() },
      });

      await expect(service.login(body, req)).rejects.toBeInstanceOf(HttpException);
    });

    it("rethrows upstream errors", async () => {
      const error = new Error("upstream");
      authApiMock.signInEmail.mockRejectedValue(error);

      await expect(service.login(body, req)).rejects.toBe(error);
    });
  });

  describe("resendVerifyEmail", () => {
    const body = { email: "test@example.com" };
    const user = { id: "user-1", email: body.email };

    it("throws BadRequestException when user does not exist or is already verified", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.resendVerifyEmail(body as any)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("throws BadRequestException when previous token has not expired", async () => {
      prismaMock.user.findUnique.mockResolvedValue(user);
      redisGetMock.mockResolvedValue("existing-token");

      await expect(service.resendVerifyEmail(body as any)).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(redisGetMock).toHaveBeenCalledWith("sendVerificationEmail:user-1");
    });

    it("throws HttpException when sendVerificationEmail fails", async () => {
      prismaMock.user.findUnique.mockResolvedValue(user);
      redisGetMock.mockResolvedValue(null);
      authApiMock.sendVerificationEmail.mockResolvedValue({ status: 0 });

      await expect(service.resendVerifyEmail(body as any)).rejects.toBeInstanceOf(
        HttpException
      );
    });

    it("completes successfully when verification email is sent", async () => {
      prismaMock.user.findUnique.mockResolvedValue(user);
      redisGetMock.mockResolvedValue(null);
      authApiMock.sendVerificationEmail.mockResolvedValue({ status: 200 });

      await expect(service.resendVerifyEmail(body as any)).resolves.toBeUndefined();
      expect(authApiMock.sendVerificationEmail).toHaveBeenCalledWith({
        body: {
          email: body.email,
          callbackURL: "/",
        },
      });
    });
  });

  describe("logout", () => {
    const sessionToken = "session-token";
    const req = { headers: { cookie: "x=y" } } as any;

    it("returns response when revokeSession succeeds", async () => {
      const response = { ok: true };
      authApiMock.revokeSession.mockResolvedValue(response);

      await expect(service.logout(sessionToken, req)).resolves.toBe(response);
      expect(authApiMock.revokeSession).toHaveBeenCalledWith({
        body: { token: sessionToken },
        headers: req.headers,
      });
    });

    it("throws InternalServerErrorException when revokeSession returns falsy value", async () => {
      authApiMock.revokeSession.mockResolvedValue(null);

      await expect(service.logout(sessionToken, req)).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
    });
  });

  describe("requestPasswordReset", () => {
    const body = { email: "test@example.com" };

    it("throws BadRequestException when user does not exist", async () => {
      prismaMock.user.count.mockResolvedValue(0);

      await expect(
        service.requestPasswordReset(body as any)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws BadRequestException when previous reset token has not expired", async () => {
      prismaMock.user.count.mockResolvedValue(1);
      redisGetMock.mockResolvedValue("existing-token");

      await expect(
        service.requestPasswordReset(body as any)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(redisGetMock).toHaveBeenCalledWith(
        "sendResetPasswordEmail:test@example.com"
      );
    });

    it("returns response when requestPasswordReset succeeds", async () => {
      const response = { status: true };
      prismaMock.user.count.mockResolvedValue(1);
      redisGetMock.mockResolvedValue(null);
      authApiMock.requestPasswordReset.mockResolvedValue(response);

      await expect(service.requestPasswordReset(body as any)).resolves.toBe(response);
      expect(authApiMock.requestPasswordReset).toHaveBeenCalledWith({
        body: { email: body.email },
      });
    });
  });

  describe("resetPassword", () => {
    const body = { token: "reset-token", password: "new-password" };

    it("returns response when resetPassword succeeds", async () => {
      const response = { success: true };
      authApiMock.resetPassword.mockResolvedValue(response);

      await expect(service.resetPassword(body as any)).resolves.toBe(response);
      expect(authApiMock.resetPassword).toHaveBeenCalledWith({
        body: {
          newPassword: body.password,
          token: body.token,
        },
      });
    });

    it("maps INVALID_TOKEN error to BadRequestException", async () => {
      authApiMock.resetPassword.mockRejectedValue({
        statusCode: 400,
        body: { code: "INVALID_TOKEN" },
      });

      await expect(service.resetPassword(body as any)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("rethrows non-INVALID_TOKEN errors", async () => {
      const error = new Error("upstream");
      authApiMock.resetPassword.mockRejectedValue(error);

      await expect(service.resetPassword(body as any)).rejects.toBe(error);
    });
  });

  describe("changePassword", () => {
    const headers = { cookie: "x=y" };
    const body = { currentPassword: "old-password", newPassword: "new-password" };

    it("returns response on success", async () => {
      const response = { status: 200 };
      authApiMock.changePassword.mockResolvedValue(response);

      await expect(service.changePassword(headers, body as any)).resolves.toBe(
        response
      );
      expect(authApiMock.changePassword).toHaveBeenCalledWith({
        body: {
          newPassword: body.newPassword,
          currentPassword: body.currentPassword,
          revokeOtherSessions: true,
        },
        headers,
        asResponse: true,
      });
    });

    it("throws BadRequestException when changePassword returns 400", async () => {
      authApiMock.changePassword.mockResolvedValue({ status: 400 });

      await expect(service.changePassword(headers, body as any)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });
  });

  describe("getSession", () => {
    it("throws NotFoundException when getSession returns null", async () => {
      authApiMock.getSession.mockResolvedValue(null);

      await expect(service.getSession({})).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns normalized session payload when session exists", async () => {
      const sessionData = {
        user: {
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
          role: "admin",
        },
        session: {
          expiresAt: "2026-01-01T00:00:00.000Z",
          id: "s-1",
        },
      };
      authApiMock.getSession.mockResolvedValue(sessionData);

      await expect(service.getSession({ cookie: "x=y" })).resolves.toEqual({
        user: {
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
        },
        session: {
          expiresAt: "2026-01-01T00:00:00.000Z",
        },
      });
    });
  });
});
