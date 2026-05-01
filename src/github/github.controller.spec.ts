import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";

jest.mock("@thallesp/nestjs-better-auth", () => ({
  AuthService: class AuthService {},
  AllowAnonymous: () => () => undefined,
}));

jest.mock("./github.service", () => ({
  GithubService: class GithubService {},
}));

jest.mock("../utils/verify-webhook-request", () => ({
  verifyGitHubWebhook: jest.fn(),
}));

import { verifyGitHubWebhook } from "../utils/verify-webhook-request";
import { GithubController } from "./github.controller";
import { GithubService } from "./github.service";

describe("GithubController", () => {
  let controller: GithubController;
  let githubServiceMock: Record<string, jest.Mock>;
  let configGetMock: jest.Mock;
  let module: TestingModule;

  const createResponseMock = () => {
    const res: any = {};
    res.json = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    githubServiceMock = {
      connect: jest.fn(),
      callback: jest.fn(),
      receiveWebhookFromGitHub: jest.fn(),
      getAllUserRepo: jest.fn(),
    };
    configGetMock = jest.fn().mockImplementation((key: string) => {
      if (key === "MAX_LIMIT") return 50;
      if (key === "GITHUB_SECRET") return "top-secret";
      return undefined;
    });

    (verifyGitHubWebhook as jest.Mock).mockReset();

    module = await Test.createTestingModule({
      controllers: [GithubController],
      providers: [
        {
          provide: GithubService,
          useValue: githubServiceMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: configGetMock,
          },
        },
      ],
    }).compile();

    controller = module.get<GithubController>(GithubController);
  });

  const buildController = async (getImpl: jest.Mock) => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubController],
      providers: [
        {
          provide: GithubService,
          useValue: githubServiceMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: getImpl,
          },
        },
      ],
    }).compile();

    return module.get<GithubController>(GithubController);
  };

  afterAll(async () => {
    await module.close();
  });

  describe("connect", () => {
    it("returns success response with generated URL", async () => {
      const req = { session: { user: { id: "user-1" } } } as any;
      const res = createResponseMock();
      githubServiceMock.connect.mockResolvedValue("https://github.com/apps/test");

      await controller.connect(req, res);

      expect(githubServiceMock.connect).toHaveBeenCalledWith("user-1");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "GitHub connect URL generated",
        data: "https://github.com/apps/test",
        error: null,
      });
    });

    it("wraps unknown errors", async () => {
      const req = { session: { user: { id: "user-1" } } } as any;
      const res = createResponseMock();
      githubServiceMock.connect.mockRejectedValue(new Error("boom"));

      await expect(controller.connect(req, res)).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
    });

    it("rethrows HttpException errors", async () => {
      const req = { session: { user: { id: "user-1" } } } as any;
      const res = createResponseMock();
      const error = new BadRequestException("bad request");
      githubServiceMock.connect.mockRejectedValue(error);

      await expect(controller.connect(req, res)).rejects.toBe(error);
    });

    it("wraps malformed session access as an internal server error", async () => {
      const req = {} as any;
      const res = createResponseMock();

      await expect(controller.connect(req, res)).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
      expect(githubServiceMock.connect).not.toHaveBeenCalled();
    });
  });

  describe("callback", () => {
    it("returns success response", async () => {
      const req = { session: { user: { id: "user-1" } } } as any;
      const res = createResponseMock();
      githubServiceMock.callback.mockResolvedValue(true);

      await controller.callback(12 as any, "state-1", req, res);

      expect(githubServiceMock.callback).toHaveBeenCalledWith(
        { installation_id: 12, state: "state-1" },
        "user-1"
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "GitHub account connected successfully",
        data: true,
        error: null,
      });
    });

    it("rethrows HttpException errors", async () => {
      const req = { session: { user: { id: "user-1" } } } as any;
      const res = createResponseMock();
      const error = new BadRequestException("Invalid connection state");
      githubServiceMock.callback.mockRejectedValue(error);

      await expect(
        controller.callback(12 as any, "state-1", req, res)
      ).rejects.toBe(error);
    });

    it("wraps unknown errors", async () => {
      const req = { session: { user: { id: "user-1" } } } as any;
      const res = createResponseMock();
      githubServiceMock.callback.mockRejectedValue(new Error("boom"));

      await expect(
        controller.callback(12 as any, "state-1", req, res)
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it("wraps malformed session access as an internal server error", async () => {
      const req = {} as any;
      const res = createResponseMock();

      await expect(
        controller.callback(12 as any, "state-1", req, res)
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(githubServiceMock.callback).not.toHaveBeenCalled();
    });
  });

  describe("receiveWebhookFromGitHub", () => {
    it("throws BadRequestException when signature header is an array", async () => {
      const req = {
        headers: { "x-hub-signature-256": ["a", "b"] },
        body: Buffer.from("{}"),
      } as any;

      await expect(controller.receiveWebhookFromGitHub(req)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("throws BadRequestException when body is not a buffer", async () => {
      const req = {
        headers: { "x-hub-signature-256": "sha256=abc", "x-github-event": "push" },
        body: {},
      } as any;

      await expect(controller.receiveWebhookFromGitHub(req)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("throws BadRequestException when signature is invalid", async () => {
      const req = {
        headers: { "x-hub-signature-256": "sha256=abc", "x-github-event": "push" },
        body: Buffer.from("{}"),
      } as any;
      (verifyGitHubWebhook as jest.Mock).mockReturnValue(false);

      await expect(controller.receiveWebhookFromGitHub(req)).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(verifyGitHubWebhook).toHaveBeenCalledWith(
        req.body,
        "sha256=abc",
        "top-secret"
      );
    });

    it("throws BadRequestException when the signature header is missing", async () => {
      const req = {
        headers: { "x-github-event": "push" },
        body: Buffer.from("{}"),
      } as any;
      (verifyGitHubWebhook as jest.Mock).mockReturnValue(false);

      await expect(controller.receiveWebhookFromGitHub(req)).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(verifyGitHubWebhook).toHaveBeenCalledWith(
        req.body,
        undefined,
        "top-secret"
      );
    });

    it("throws BadRequestException when payload JSON is invalid", async () => {
      const req = {
        headers: { "x-hub-signature-256": "sha256=abc", "x-github-event": "push" },
        body: Buffer.from("{"),
      } as any;
      (verifyGitHubWebhook as jest.Mock).mockReturnValue(true);

      await expect(controller.receiveWebhookFromGitHub(req)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("returns success response for valid webhook payload", async () => {
      const req = {
        headers: { "x-hub-signature-256": "sha256=abc", "x-github-event": "push" },
        body: Buffer.from(JSON.stringify({ repository: { id: 1 } })),
      } as any;
      (verifyGitHubWebhook as jest.Mock).mockReturnValue(true);
      githubServiceMock.receiveWebhookFromGitHub.mockResolvedValue(true);

      await expect(controller.receiveWebhookFromGitHub(req)).resolves.toEqual({
        success: true,
        message: "Webhook data received successfully",
        data: null,
        error: null,
      });
      expect(githubServiceMock.receiveWebhookFromGitHub).toHaveBeenCalledWith(
        { repository: { id: 1 } },
        "push"
      );
    });

    it("uses the default secret when config is missing", async () => {
      configGetMock.mockImplementation((key: string) => {
        if (key === "MAX_LIMIT") return 50;
        return undefined;
      });
      controller = await buildController(configGetMock);

      const req = {
        headers: { "x-hub-signature-256": "sha256=abc", "x-github-event": "push" },
        body: Buffer.from(JSON.stringify({ repository: { id: 1 } })),
      } as any;
      (verifyGitHubWebhook as jest.Mock).mockReturnValue(true);
      githubServiceMock.receiveWebhookFromGitHub.mockResolvedValue(true);

      await controller.receiveWebhookFromGitHub(req);

      expect(verifyGitHubWebhook).toHaveBeenCalledWith(
        req.body,
        "sha256=abc",
        "GitHub_secret"
      );
    });

    it("rethrows HttpException errors from service", async () => {
      const req = {
        headers: { "x-hub-signature-256": "sha256=abc", "x-github-event": "push" },
        body: Buffer.from(JSON.stringify({ repository: { id: 1 } })),
      } as any;
      const error = new BadRequestException("Invalid event");
      (verifyGitHubWebhook as jest.Mock).mockReturnValue(true);
      githubServiceMock.receiveWebhookFromGitHub.mockRejectedValue(error);

      await expect(controller.receiveWebhookFromGitHub(req)).rejects.toBe(error);
    });

    it("wraps unknown errors from service", async () => {
      const req = {
        headers: { "x-hub-signature-256": "sha256=abc", "x-github-event": "push" },
        body: Buffer.from(JSON.stringify({ repository: { id: 1 } })),
      } as any;
      (verifyGitHubWebhook as jest.Mock).mockReturnValue(true);
      githubServiceMock.receiveWebhookFromGitHub.mockRejectedValue(new Error("boom"));

      await expect(controller.receiveWebhookFromGitHub(req)).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
    });

    it("passes through an undefined event header when the payload is otherwise valid", async () => {
      const req = {
        headers: { "x-hub-signature-256": "sha256=abc" },
        body: Buffer.from(JSON.stringify({ repository: { id: 1 } })),
      } as any;
      (verifyGitHubWebhook as jest.Mock).mockReturnValue(true);
      githubServiceMock.receiveWebhookFromGitHub.mockResolvedValue(true);

      await controller.receiveWebhookFromGitHub(req);

      expect(githubServiceMock.receiveWebhookFromGitHub).toHaveBeenCalledWith(
        { repository: { id: 1 } },
        undefined
      );
    });
  });

  describe("getAllUserRepo", () => {
    const req = { session: { user: { id: "user-1" } } } as any;

    it("returns repo data with parsed pagination values", async () => {
      const data = {
        data: [{ id: "repo-1", name: "repo-one" }],
        pagination: { currentPage: 2, pageSize: 10 },
      };
      githubServiceMock.getAllUserRepo.mockResolvedValue(data);

      await expect(
        controller.getAllUserRepo(req, { page: "2", limit: "10" })
      ).resolves.toEqual({
        success: true,
        message: "Here's the repo data",
        data,
        error: null,
      });
      expect(githubServiceMock.getAllUserRepo).toHaveBeenCalledWith(
        "user-1",
        10,
        2
      );
    });

    it("uses default pagination values for invalid query params", async () => {
      githubServiceMock.getAllUserRepo.mockResolvedValue({ data: [], pagination: {} });

      await controller.getAllUserRepo(req, { page: "x", limit: "0" });

      expect(githubServiceMock.getAllUserRepo).toHaveBeenCalledWith(
        "user-1",
        10,
        1
      );
    });

    it("throws BadRequestException when limit reaches MAX_LIMIT", async () => {
      await expect(
        controller.getAllUserRepo(req, { page: "1", limit: "50" })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(githubServiceMock.getAllUserRepo).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when limit is above MAX_LIMIT", async () => {
      await expect(
        controller.getAllUserRepo(req, { page: "1", limit: "500" })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(githubServiceMock.getAllUserRepo).not.toHaveBeenCalled();
    });

    it("allows values below MAX_LIMIT and clamps negative page values", async () => {
      githubServiceMock.getAllUserRepo.mockResolvedValue({ data: [], pagination: {} });

      await controller.getAllUserRepo(req, { page: "-7", limit: "49" });

      expect(githubServiceMock.getAllUserRepo).toHaveBeenCalledWith(
        "user-1",
        49,
        1
      );
    });

    it("uses parseInt semantics for mixed numeric query values", async () => {
      githubServiceMock.getAllUserRepo.mockResolvedValue({ data: [], pagination: {} });

      await controller.getAllUserRepo(req, { page: "3items", limit: "12repos" });

      expect(githubServiceMock.getAllUserRepo).toHaveBeenCalledWith(
        "user-1",
        12,
        3
      );
    });

    it("uses the default MAX_LIMIT when config is missing", async () => {
      const localConfigGetMock = jest.fn().mockReturnValue(undefined);
      controller = await buildController(localConfigGetMock);
      githubServiceMock.getAllUserRepo.mockResolvedValue({ data: [], pagination: {} });

      await controller.getAllUserRepo(req, { page: "1", limit: "99" });

      expect(githubServiceMock.getAllUserRepo).toHaveBeenCalledWith(
        "user-1",
        99,
        1
      );
    });

    it("uses the default MAX_LIMIT when config returns NaN", async () => {
      const localConfigGetMock = jest.fn().mockImplementation((key: string) => {
        if (key === "MAX_LIMIT") return Number.NaN;
        if (key === "GITHUB_SECRET") return "top-secret";
        return undefined;
      });
      controller = await buildController(localConfigGetMock);
      githubServiceMock.getAllUserRepo.mockResolvedValue({ data: [], pagination: {} });

      await controller.getAllUserRepo(req, { page: "1", limit: "99" });

      expect(githubServiceMock.getAllUserRepo).toHaveBeenCalledWith(
        "user-1",
        99,
        1
      );
    });

    it("rethrows HttpException errors", async () => {
      const error = new NotFoundException();
      githubServiceMock.getAllUserRepo.mockRejectedValue(error);

      await expect(
        controller.getAllUserRepo(req, { page: "1", limit: "10" })
      ).rejects.toBe(error);
    });

    it("wraps unknown errors", async () => {
      githubServiceMock.getAllUserRepo.mockRejectedValue(new Error("boom"));

      await expect(
        controller.getAllUserRepo(req, { page: "1", limit: "10" })
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it("wraps malformed session access as an internal server error", async () => {
      await expect(
        controller.getAllUserRepo({} as any, { page: "1", limit: "10" })
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(githubServiceMock.getAllUserRepo).not.toHaveBeenCalled();
    });
  });
});
