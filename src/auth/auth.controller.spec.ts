import {
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";

jest.mock("@thallesp/nestjs-better-auth", () => ({
  AuthService: class AuthService {},
  AllowAnonymous: () => () => undefined,
}));

jest.mock("../redis", () => ({
  redis: {
    get: jest.fn(),
  },
}));

import { AuthController } from "./auth.controller";
import { AuthServiceLocal } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authServiceMock: Record<string, jest.Mock>;
  let configServiceMock: { get: jest.Mock };

  const createResponseMock = () => {
    const res: any = {};
    res.json = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    authServiceMock = {
      signUp: jest.fn(),
      verifyEmail: jest.fn(),
      login: jest.fn(),
      resendVerifyEmail: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
      getSession: jest.fn(),
    };

    configServiceMock = {
      get: jest.fn().mockImplementation((key: string) =>
        key === "COOKIE_PREFIX" ? "shobapp24" : undefined
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthServiceLocal,
          useValue: authServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe("signup", () => {
    const body = {
      email: "test@example.com",
      name: "Test User",
      password: "password123",
    } as any;

    it("returns success response", async () => {
      const res = createResponseMock();
      authServiceMock.signUp.mockResolvedValue(true);

      await controller.signup(body, res);

      expect(authServiceMock.signUp).toHaveBeenCalledWith(body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "If email is valid the you'll get an email",
        data: null,
        error: null,
      });
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(res.clearCookie).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("rethrows HttpException errors", async () => {
      const res = createResponseMock();
      const error = new BadRequestException("invalid");
      authServiceMock.signUp.mockRejectedValue(error);

      await expect(controller.signup(body, res)).rejects.toBe(error);
    });

    it("wraps unknown errors", async () => {
      const res = createResponseMock();
      authServiceMock.signUp.mockRejectedValue(new Error("boom"));

      await expect(controller.signup(body, res)).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
    });
  });

  describe("verifyEmail", () => {
    const token = { token: "abc-token" } as any;
    const req = { headers: { cookie: "x=y" } } as any;

    it("sets cookie and returns success response when service returns a cookie", async () => {
      const res = createResponseMock();
      authServiceMock.verifyEmail.mockResolvedValue("session=1; Path=/; HttpOnly");

      await controller.verifyEmail(token, req, res);

      expect(authServiceMock.verifyEmail).toHaveBeenCalledWith(token, req);
      expect(res.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        "session=1; Path=/; HttpOnly"
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Email verified successfully",
        data: null,
        error: null,
      });
    });

    it("does not set cookie when service returns nothing", async () => {
      const res = createResponseMock();
      authServiceMock.verifyEmail.mockResolvedValue(undefined);

      await controller.verifyEmail(token, req, res);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it("rethrows HttpException errors", async () => {
      const res = createResponseMock();
      const error = new BadRequestException("invalid token");
      authServiceMock.verifyEmail.mockRejectedValue(error);

      await expect(controller.verifyEmail(token, req, res)).rejects.toBe(error);
    });

    it("wraps unknown errors", async () => {
      const res = createResponseMock();
      authServiceMock.verifyEmail.mockRejectedValue(new Error("boom"));

      await expect(controller.verifyEmail(token, req, res)).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
    });
  });

  describe("login", () => {
    const body = {
      email: "test@example.com",
      password: "password123",
    } as any;
    const req = { headers: { cookie: "x=y" } } as any;

    it("sets cookie and returns success response", async () => {
      const res = createResponseMock();
      authServiceMock.login.mockResolvedValue("session=1; Path=/; HttpOnly");

      await controller.login(body, res, req);

      expect(authServiceMock.login).toHaveBeenCalledWith(body, req);
      expect(res.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        "session=1; Path=/; HttpOnly"
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "You've logged in successfully",
        data: null,
        error: null,
      });
    });

    it("wraps unknown errors", async () => {
      const res = createResponseMock();
      authServiceMock.login.mockRejectedValue(new Error("boom"));

      await expect(controller.login(body, res, req)).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
    });

    it("rethrows HttpException errors", async () => {
      const res = createResponseMock();
      const error = new HttpException("invalid", HttpStatus.BAD_REQUEST);
      authServiceMock.login.mockRejectedValue(error);

      await expect(controller.login(body, res, req)).rejects.toBe(error);
    });
  });

  describe("resendVerifyEmail", () => {
    const body = { email: "test@example.com" } as any;

    it("returns success response", async () => {
      const res = createResponseMock();
      authServiceMock.resendVerifyEmail.mockResolvedValue(true);

      await controller.resendVerifyEmail(body, res);

      expect(authServiceMock.resendVerifyEmail).toHaveBeenCalledWith(body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "The email has been sent",
        data: null,
        error: null,
      });
    });

    it("rethrows HttpException errors", async () => {
      const res = createResponseMock();
      const error = new BadRequestException("invalid");
      authServiceMock.resendVerifyEmail.mockRejectedValue(error);

      await expect(controller.resendVerifyEmail(body, res)).rejects.toBe(error);
    });

    it("wraps unknown errors", async () => {
      const res = createResponseMock();
      authServiceMock.resendVerifyEmail.mockRejectedValue(new Error("boom"));

      await expect(controller.resendVerifyEmail(body, res)).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
    });
  });

  describe("logout", () => {
    const req = {
      cookies: {
        "__Secure-shobapp24.session_token": "session-token",
      },
      headers: { cookie: "x=y" },
    } as any;

    it("returns bad request when no session token is present", async () => {
      const res = createResponseMock();

      await controller.logout({ cookies: {} } as any, res);

      expect(authServiceMock.logout).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        message: "No session token provided",
      });
    });

    it("clears cookie and returns success response", async () => {
      const res = createResponseMock();
      authServiceMock.logout.mockResolvedValue({ ok: true });

      await controller.logout(req, res);

      expect(authServiceMock.logout).toHaveBeenCalledWith("session-token", req);
      expect(res.clearCookie).toHaveBeenCalledWith("better-auth.session_token");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Logged out successfully",
        data: null,
        error: null,
      });
    });

    it("rethrows HttpException errors", async () => {
      const res = createResponseMock();
      const error = new HttpException("invalid", HttpStatus.BAD_REQUEST);
      authServiceMock.logout.mockRejectedValue(error);

      await expect(controller.logout(req, res)).rejects.toBe(error);
    });

    it("wraps unknown errors", async () => {
      const res = createResponseMock();
      authServiceMock.logout.mockRejectedValue(new Error("boom"));

      await expect(controller.logout(req, res)).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
    });

    it("uses the default cookie prefix when config does not provide one", async () => {
      const fallbackController = new AuthController(authServiceMock as any, {
        get: jest.fn().mockReturnValue(undefined),
      } as any);
      const res = createResponseMock();
      const fallbackReq = {
        cookies: {
          "__Secure-shobapp24.session_token": "session-token",
        },
        headers: { cookie: "x=y" },
      } as any;
      authServiceMock.logout.mockResolvedValue({ ok: true });

      await fallbackController.logout(fallbackReq, res);

      expect(authServiceMock.logout).toHaveBeenCalledWith(
        "session-token",
        fallbackReq
      );
    });
  });

  describe("requestPasswordReset", () => {
    const body = { email: "test@example.com" } as any;

    it("returns success response", async () => {
      const res = createResponseMock();
      authServiceMock.requestPasswordReset.mockResolvedValue({ ok: true });

      await controller.requestPasswordReset(body, res);

      expect(authServiceMock.requestPasswordReset).toHaveBeenCalledWith(body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Check your email for the reset link",
        data: null,
        error: null,
      });
    });

    it("rethrows HttpException errors", async () => {
      const res = createResponseMock();
      const error = new BadRequestException("invalid");
      authServiceMock.requestPasswordReset.mockRejectedValue(error);

      await expect(controller.requestPasswordReset(body, res)).rejects.toBe(error);
    });

    it("wraps unknown errors", async () => {
      const res = createResponseMock();
      authServiceMock.requestPasswordReset.mockRejectedValue(new Error("boom"));

      await expect(
        controller.requestPasswordReset(body, res)
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe("resetPassword", () => {
    it("returns success response for valid payload", async () => {
      const res = createResponseMock();
      authServiceMock.resetPassword.mockResolvedValue({ ok: true });

      await controller.resetPassword("valid-reset-token", "new-password", res);

      expect(authServiceMock.resetPassword).toHaveBeenCalledWith({
        token: "valid-reset-token",
        password: "new-password",
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "The password has been changed",
        data: null,
        error: null,
      });
    });

    it("throws BadRequestException for invalid payload", async () => {
      const res = createResponseMock();

      await expect(controller.resetPassword("", "", res)).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
    });

    it("rethrows HttpException errors", async () => {
      const res = createResponseMock();
      const error = new BadRequestException("invalid token");
      authServiceMock.resetPassword.mockRejectedValue(error);

      await expect(
        controller.resetPassword("valid-reset-token", "new-password", res)
      ).rejects.toBe(error);
    });

    it("wraps unknown errors", async () => {
      const res = createResponseMock();
      authServiceMock.resetPassword.mockRejectedValue(new Error("boom"));

      await expect(
        controller.resetPassword("valid-reset-token", "new-password", res)
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe("changePassword", () => {
    const headers = { cookie: "x=y" };
    const body = {
      currentPassword: "old-password",
      newPassword: "new-password",
    } as any;

    it("returns success response", async () => {
      const res = createResponseMock();
      authServiceMock.changePassword.mockResolvedValue({ ok: true });

      await controller.changePassword(body, headers, res);

      expect(authServiceMock.changePassword).toHaveBeenCalledWith(headers, body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "The password has been changed",
        data: null,
        error: null,
      });
    });

    it("rethrows HttpException errors", async () => {
      const res = createResponseMock();
      const error = new HttpException("invalid", HttpStatus.BAD_REQUEST);
      authServiceMock.changePassword.mockRejectedValue(error);

      await expect(controller.changePassword(body, headers, res)).rejects.toBe(
        error
      );
    });

    it("wraps unknown errors", async () => {
      const res = createResponseMock();
      authServiceMock.changePassword.mockRejectedValue(new Error("boom"));

      await expect(
        controller.changePassword(body, headers, res)
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe("getSession", () => {
    const headers = { cookie: "x=y" };

    it("returns the service response directly", async () => {
      const session = {
        user: {
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
        },
        session: {
          expiresAt: "2026-01-01T00:00:00.000Z",
        },
      };
      authServiceMock.getSession.mockResolvedValue(session);

      await expect(controller.getSession(headers)).resolves.toBe(session);
      expect(authServiceMock.getSession).toHaveBeenCalledWith(headers);
    });

    it("rethrows HttpException errors", async () => {
      const error = new NotFoundException("No session data found");
      authServiceMock.getSession.mockRejectedValue(error);

      await expect(controller.getSession(headers)).rejects.toBe(error);
    });

    it("wraps unknown errors", async () => {
      authServiceMock.getSession.mockRejectedValue(new Error("boom"));

      await expect(controller.getSession(headers)).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
    });
  });
});
