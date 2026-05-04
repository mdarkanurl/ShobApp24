import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";

jest.mock("../redis", () => ({
  redis: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock("../utils/rabbitmq", () => ({
  sendGitHubWebhookData: jest.fn(),
}));

import { redis } from "../redis";
import { sendGitHubWebhookData } from "../utils/rabbitmq";
import { PrismaService } from "../prisma/prisma.service";
import { GithubService } from "./github.service";

describe("GithubService", () => {
  let service: GithubService;
  let configGetMock: jest.Mock;
  let prismaMock: {
    githubConnection: {
      count: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
    };
    gitHubRepo: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let redisMock: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };
  let module: TestingModule;

  beforeEach(async () => {
    prismaMock = {
      githubConnection: {
        count: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      gitHubRepo: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    redisMock = redis as unknown as {
      set: jest.Mock;
      get: jest.Mock;
      del: jest.Mock;
    };
    redisMock.set.mockReset();
    redisMock.get.mockReset();
    redisMock.del.mockReset();
    (sendGitHubWebhookData as jest.Mock).mockReset();
    configGetMock = jest.fn().mockImplementation((key: string) =>
      key === "GITHUB_APP_NAME" ? "custom-app" : undefined
    );

    module = await Test.createTestingModule({
      providers: [
        GithubService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: configGetMock,
          },
        },
      ],
    }).compile();

    service = module.get<GithubService>(GithubService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe("connect", () => {
    it("stores connection state in redis and returns the install URL", async () => {
      redisMock.set.mockResolvedValue("OK");

      const url = await service.connect("user-1" as any);
      const state = new URL(url.trim()).searchParams.get("state");

      expect(state).toBeTruthy();
      expect(redisMock.set).toHaveBeenCalledWith(
        `github_connction_state:${state}`,
        "user-1",
        "EX",
        600
      );
      expect(url).toContain("https://github.com/apps/custom-app/installations/new");
    });

    it("falls back to the default app name when config is missing", async () => {
      configGetMock.mockReturnValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GithubService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
          {
            provide: ConfigService,
            useValue: {
              get: configGetMock,
            },
          },
        ],
      }).compile();

      service = module.get<GithubService>(GithubService);
      redisMock.set.mockResolvedValue("OK");

      const url = await service.connect("user-1" as any);

      expect(url).toContain("https://github.com/apps/shobapp24/installations/new");
    });

    it("propagates redis errors", async () => {
      redisMock.set.mockRejectedValue(new Error("redis down"));

      await expect(service.connect("user-1" as any)).rejects.toThrow("redis down");
    });
  });

  describe("callback", () => {
    const userId = "user-1" as any;

    it("throws BadRequestException when callback params are missing", async () => {
      await expect(
        service.callback({ installation_id: undefined as any, state: "" }, userId)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws BadRequestException when state is invalid", async () => {
      redisMock.get.mockResolvedValue(null);

      await expect(
        service.callback({ installation_id: 12, state: "abc" }, userId)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(redisMock.get).toHaveBeenCalledWith("github_connction_state:abc");
    });

    it("throws BadRequestException when state belongs to another user", async () => {
      redisMock.get.mockResolvedValue("user-2");

      await expect(
        service.callback({ installation_id: 12, state: "abc" }, userId)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("treats installation_id zero as missing callback parameters", async () => {
      await expect(
        service.callback({ installation_id: 0 as any, state: "abc" }, userId)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("updates existing installation and returns empty object", async () => {
      redisMock.get.mockResolvedValue("user-1");
      prismaMock.githubConnection.count.mockResolvedValue(1);
      prismaMock.githubConnection.update.mockResolvedValue({ installationId: 12 });
      redisMock.del.mockResolvedValue(1);

      await expect(
        service.callback({ installation_id: 12, state: "abc" }, userId)
      ).resolves.toStrictEqual({});
      expect(redisMock.del).toHaveBeenCalledWith("github_connction_state:abc");
      expect(prismaMock.githubConnection.update).toHaveBeenCalledWith({
        where: {
          installationId: 12,
        },
        data: {
          userId,
        },
      });
    });

    it("returns not found when installation is not found", async () => {
      redisMock.get.mockResolvedValue("user-1");
      prismaMock.githubConnection.count.mockResolvedValue(0);

      await expect(
        service.callback({ installation_id: 12, state: "abc" }, userId)
      ).rejects.toThrow(BadRequestException);
      expect(redisMock.del).not.toHaveBeenCalled();
      expect(prismaMock.githubConnection.update).not.toHaveBeenCalled();
    });

    it("propagates redis get errors", async () => {
      redisMock.get.mockRejectedValue(new Error("redis read failed"));

      await expect(
        service.callback({ installation_id: 12, state: "abc" }, userId)
      ).rejects.toThrow("redis read failed");
    });

    it("propagates prisma count errors", async () => {
      redisMock.get.mockResolvedValue("user-1");
      prismaMock.githubConnection.count.mockRejectedValue(new Error("count failed"));

      await expect(
        service.callback({ installation_id: 12, state: "abc" }, userId)
      ).rejects.toThrow("count failed");
    });

    it("propagates redis delete errors before updating the installation", async () => {
      redisMock.get.mockResolvedValue("user-1");
      prismaMock.githubConnection.count.mockResolvedValue(1);
      redisMock.del.mockRejectedValue(new Error("redis delete failed"));

      await expect(
        service.callback({ installation_id: 12, state: "abc" }, userId)
      ).rejects.toThrow("redis delete failed");
      expect(prismaMock.githubConnection.update).not.toHaveBeenCalled();
    });

    it("propagates prisma update errors after deleting redis state", async () => {
      redisMock.get.mockResolvedValue("user-1");
      prismaMock.githubConnection.count.mockResolvedValue(1);
      redisMock.del.mockResolvedValue(1);
      prismaMock.githubConnection.update.mockRejectedValue(new Error("db failed"));

      await expect(
        service.callback({ installation_id: 12, state: "abc" }, userId)
      ).rejects.toThrow("db failed");
      expect(redisMock.del).toHaveBeenCalledWith("github_connction_state:abc");
    });
  });

  describe("receiveWebhookFromGitHub", () => {
    it("sends webhook data to RabbitMQ and returns true", async () => {
      (sendGitHubWebhookData as jest.Mock).mockResolvedValue(undefined);
      const body = { repository: { id: 1 } };

      await expect(
        service.receiveWebhookFromGitHub(body, "push" as any)
      ).resolves.toBe(true);
      expect(sendGitHubWebhookData).toHaveBeenCalledWith({
        event: "push",
        data: body,
      });
    });

    it("propagates RabbitMQ publish failures", async () => {
      (sendGitHubWebhookData as jest.Mock).mockRejectedValue(new Error("queue down"));

      await expect(
        service.receiveWebhookFromGitHub({ repository: { id: 1 } }, "push" as any)
      ).rejects.toThrow("queue down");
    });
  });

  describe("getAllUserRepo", () => {
    const userId = "user-1" as any;

    it("throws NotFoundException when the user has no github connection", async () => {
      prismaMock.githubConnection.findFirst.mockResolvedValue(null);

      await expect(service.getAllUserRepo(userId, 10, 1)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("propagates github connection lookup errors", async () => {
      prismaMock.githubConnection.findFirst.mockRejectedValue(
        new Error("lookup failed")
      );

      await expect(service.getAllUserRepo(userId, 10, 1)).rejects.toThrow(
        "lookup failed"
      );
    });

    it("returns repos with pagination metadata", async () => {
      prismaMock.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
      prismaMock.gitHubRepo.count.mockReturnValue("count-query");
      prismaMock.gitHubRepo.findMany.mockReturnValue("find-query");
      prismaMock.$transaction.mockResolvedValue([
        3,
        [
          { id: "repo-2", repoId: 2, name: "repo-two" },
          { id: "repo-1", repoId: 1, name: "repo-one" },
        ],
      ]);

      await expect(service.getAllUserRepo(userId, 2, 2)).resolves.toEqual({
        data: [
          { id: "repo-2", repoId: 2, name: "repo-two" },
          { id: "repo-1", repoId: 1, name: "repo-one" },
        ],
        pagination: {
          totalItems: 3,
          currentPage: 2,
          totalPages: 2,
          pageSize: 2,
          hasNextPage: false,
          hasPrevPage: true,
        },
      });
      expect(prismaMock.githubConnection.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
        },
        select: {
          id: true,
        },
      });
      expect(prismaMock.gitHubRepo.count).toHaveBeenCalledWith({
        where: {
          GithubConnectionsId: "conn-1",
        },
      });
      expect(prismaMock.gitHubRepo.findMany).toHaveBeenCalledWith({
        where: {
          GithubConnectionsId: "conn-1",
        },
        skip: 2,
        take: 2,
        orderBy: { repoId: "desc" },
      });
      expect(prismaMock.$transaction).toHaveBeenCalledWith([
        "count-query",
        "find-query",
      ]);
    });

    it("returns zero total pages and no next page for empty results", async () => {
      prismaMock.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
      prismaMock.gitHubRepo.count.mockReturnValue("count-query");
      prismaMock.gitHubRepo.findMany.mockReturnValue("find-query");
      prismaMock.$transaction.mockResolvedValue([0, []]);

      await expect(service.getAllUserRepo(userId, 10, 1)).resolves.toEqual({
        data: [],
        pagination: {
          totalItems: 0,
          currentPage: 1,
          totalPages: 0,
          pageSize: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    });

    it("marks next page correctly when more items remain", async () => {
      prismaMock.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
      prismaMock.gitHubRepo.count.mockReturnValue("count-query");
      prismaMock.gitHubRepo.findMany.mockReturnValue("find-query");
      prismaMock.$transaction.mockResolvedValue([
        5,
        [{ id: "repo-5", repoId: 5, name: "repo-five" }],
      ]);

      await expect(service.getAllUserRepo(userId, 2, 2)).resolves.toEqual({
        data: [{ id: "repo-5", repoId: 5, name: "repo-five" }],
        pagination: {
          totalItems: 5,
          currentPage: 2,
          totalPages: 3,
          pageSize: 2,
          hasNextPage: true,
          hasPrevPage: true,
        },
      });
    });

    it("uses the computed skip value when the requested page exceeds total pages", async () => {
      prismaMock.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
      prismaMock.gitHubRepo.count.mockReturnValue("count-query");
      prismaMock.gitHubRepo.findMany.mockReturnValue("find-query");
      prismaMock.$transaction.mockResolvedValue([3, []]);

      await expect(service.getAllUserRepo(userId, 1, 5)).resolves.toEqual({
        data: [],
        pagination: {
          totalItems: 3,
          currentPage: 5,
          totalPages: 3,
          pageSize: 1,
          hasNextPage: false,
          hasPrevPage: true,
        },
      });
      expect(prismaMock.gitHubRepo.findMany).toHaveBeenCalledWith({
        where: {
          GithubConnectionsId: "conn-1",
        },
        skip: 4,
        take: 1,
        orderBy: { repoId: "desc" },
      });
    });

    it("propagates transaction errors", async () => {
      prismaMock.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
      prismaMock.gitHubRepo.count.mockReturnValue("count-query");
      prismaMock.gitHubRepo.findMany.mockReturnValue("find-query");
      prismaMock.$transaction.mockRejectedValue(new Error("transaction failed"));

      await expect(service.getAllUserRepo(userId, 10, 1)).rejects.toThrow(
        "transaction failed"
      );
    });
  });
});
