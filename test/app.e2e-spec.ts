import { INestApplication, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { ActionTypes, EventType, Platform } from "@prisma/client";
import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { ActionController } from "../src/action/action.controller";
import { ActionService } from "../src/action/action.service";
import { AuthController } from "../src/auth/auth.controller";
import { AuthServiceLocal } from "../src/auth/auth.service";
import { GithubController } from "../src/github/github.controller";
import { GithubService } from "../src/github/github.service";
import { HealthController } from "../src/health/health.controller";
import { HealthService } from "../src/health/health.service";
import { WorkflowController } from "../src/workflow/workflow.controller";
import { WorkflowService } from "../src/workflow/workflow.service";

jest.mock("@thallesp/nestjs-better-auth", () => ({
  AllowAnonymous: () => () => undefined,
}));

jest.mock("../src/utils/verify-webhook-request", () => ({
  verifyGitHubWebhook: jest.fn(),
}));

import { verifyGitHubWebhook } from "../src/utils/verify-webhook-request";

describe("App routes (e2e)", () => {
  let app: INestApplication;

  const healthService = {
    getLiveness: jest.fn(),
    getReadiness: jest.fn(),
  };

  const workflowService = {
    createWorkflow: jest.fn(),
    getAllWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
    deleteOneWorkflowById: jest.fn(),
    deleteManyWorkflow: jest.fn(),
    getOneWorkflowById: jest.fn(),
  };

  const actionService = {
    getAllActionsByWorkflowId: jest.fn(),
    createAction: jest.fn(),
    getOneActionById: jest.fn(),
    deleteAllActionsByWorkflowId: jest.fn(),
    deleteActionById: jest.fn(),
  };

  const githubService = {
    connect: jest.fn(),
    callback: jest.fn(),
    receiveWebhookFromGitHub: jest.fn(),
    getAllUserRepo: jest.fn(),
  };

  const authService = {
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

  const configService = {
    get: jest.fn((key: string) => {
      if (key === "HEALTH_CHECK_SECRET") return "test-health-secret";
      if (key === "MAX_LIMIT") return 50;
      if (key === "GITHUB_SECRET") return "top-secret";
      if (key === "COOKIE_PREFIX") return "shobapp24";
      return undefined;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        HealthController,
        WorkflowController,
        ActionController,
        GithubController,
        AuthController,
      ],
      providers: [
        { provide: HealthService, useValue: healthService },
        { provide: WorkflowService, useValue: workflowService },
        { provide: ActionService, useValue: actionService },
        { provide: GithubService, useValue: githubService },
        { provide: AuthServiceLocal, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI });
    app.use("/api/v1/github/webhook", express.raw({ type: "application/json" }));
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use((req: any, _res, next) => {
      req.session = { user: { id: "user-1" } };
      next();
    });

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyGitHubWebhook as jest.Mock).mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("health routes", () => {
    it("GET /api/v1/health returns liveness data", async () => {
      healthService.getLiveness.mockReturnValue({
        status: "ok",
        checkedAt: "2026-04-24T00:00:00.000Z",
        uptime: {
          seconds: 42,
          human: "42s",
          recentlyRestarted: true,
        },
        service: "up",
      });

      const response = await request(app.getHttpServer()).get("/api/v1/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "ok",
        checkedAt: "2026-04-24T00:00:00.000Z",
        uptime: {
          seconds: 42,
          human: "42s",
          recentlyRestarted: true,
        },
        service: "up",
      });
      expect(healthService.getLiveness).toHaveBeenCalledTimes(1);
    });

    it("GET /api/v1/health/ready rejects requests without the health-check secret", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health/ready");

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Invalid health check secret");
      expect(healthService.getReadiness).not.toHaveBeenCalled();
    });

    it("GET /api/v1/health/ready rejects requests with an invalid secret", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/health/ready")
        .set("x-health-check-secret", "wrong-secret");

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Invalid health check secret");
      expect(healthService.getReadiness).not.toHaveBeenCalled();
    });

    it("GET /api/v1/health/ready returns readiness data when the secret is valid", async () => {
      healthService.getReadiness.mockResolvedValue({
        status: "ok",
        checkedAt: "2026-04-24T00:00:00.000Z",
        uptime: {
          seconds: 300,
          human: "5m 0s",
          recentlyRestarted: false,
        },
        summary: {
          app: "5m 0s",
          db: "1h 0m 0s",
          redis: "up (latency: fast)",
          rabbitmq: "up (latency: fast)",
        },
      });

      const response = await request(app.getHttpServer())
        .get("/api/v1/health/ready")
        .set("x-health-check-secret", "test-health-secret");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "ok",
        checkedAt: "2026-04-24T00:00:00.000Z",
        uptime: {
          seconds: 300,
          human: "5m 0s",
          recentlyRestarted: false,
        },
        summary: {
          app: "5m 0s",
          db: "1h 0m 0s",
          redis: "up (latency: fast)",
          rabbitmq: "up (latency: fast)",
        },
      });
      expect(healthService.getReadiness).toHaveBeenCalledTimes(1);
    });
  });

  describe("workflow routes", () => {
    it("POST /api/v1/workflow creates a workflow", async () => {
      const body = {
        name: "Build pipeline",
        platform: Platform.GitHub,
        repoId: "repo-1",
        eventType: EventType.repository,
        action: "created",
      };
      const createdWorkflow = { id: "wf-1", ...body };
      workflowService.createWorkflow.mockResolvedValue(createdWorkflow);

      const response = await request(app.getHttpServer())
        .post("/api/v1/workflow")
        .send(body);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: "Workflow created successfully",
        data: createdWorkflow,
        error: null,
      });
      expect(workflowService.createWorkflow).toHaveBeenCalledWith("user-1", body);
    });

    it("POST /api/v1/workflow rejects invalid payloads", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/workflow")
        .send({
          name: "",
          platform: Platform.GitHub,
          repoId: "repo-1",
          eventType: EventType.push,
          action: "",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["name"],
          }),
        ]),
      );
      expect(workflowService.createWorkflow).not.toHaveBeenCalled();
    });

    it("GET /api/v1/workflow returns paginated workflows", async () => {
      const data = {
        data: [{ id: "wf-1", name: "Build pipeline" }],
        pagination: {
          totalItems: 1,
          currentPage: 2,
          totalPages: 1,
          pageSize: 10,
          hasNextPage: false,
          hasPrevPage: true,
        },
      };
      workflowService.getAllWorkflow.mockResolvedValue(data);

      const response = await request(app.getHttpServer())
        .get("/api/v1/workflow?page=2&limit=10");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Here's the workflow data",
        data,
        error: null,
      });
      expect(workflowService.getAllWorkflow).toHaveBeenCalledWith("user-1", 10, 2);
    });

    it("GET /api/v1/workflow rejects oversized limits", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/workflow?limit=50");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Limit is too big");
      expect(workflowService.getAllWorkflow).not.toHaveBeenCalled();
    });

    it("PATCH /api/v1/workflow/:id updates a workflow", async () => {
      const data = { id: "wf-1", name: "Updated workflow", enabled: true };
      workflowService.updateWorkflow.mockResolvedValue(data);

      const response = await request(app.getHttpServer())
        .patch("/api/v1/workflow/wf-1")
        .send({ name: "Updated workflow", enabled: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Workflow updated successfully",
        data,
        error: null,
      });
      expect(workflowService.updateWorkflow).toHaveBeenCalledWith(
        "wf-1",
        "user-1",
        { name: "Updated workflow", enabled: true },
      );
    });

    it("PATCH /api/v1/workflow/:id rejects empty updates", async () => {
      const response = await request(app.getHttpServer())
        .patch("/api/v1/workflow/wf-1")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "At least one field must be provided",
          }),
        ]),
      );
      expect(workflowService.updateWorkflow).not.toHaveBeenCalled();
    });

    it("DELETE /api/v1/workflow/:id deletes a workflow", async () => {
      const data = { id: "wf-1", deleted: true };
      workflowService.deleteOneWorkflowById.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).delete("/api/v1/workflow/wf-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Workflow deleted successfully",
        data,
        error: null,
      });
      expect(workflowService.deleteOneWorkflowById).toHaveBeenCalledWith("wf-1", "user-1");
    });

    it("DELETE /api/v1/workflow deletes multiple workflows", async () => {
      const data = { deletedCount: 2, ids: ["wf-1", "wf-2"] };
      workflowService.deleteManyWorkflow.mockResolvedValue(data);

      const response = await request(app.getHttpServer())
        .delete("/api/v1/workflow")
        .send({ ids: ["wf-1", "wf-2"] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Workflows deleted successfully",
        data,
        error: null,
      });
      expect(workflowService.deleteManyWorkflow).toHaveBeenCalledWith("user-1", [
        "wf-1",
        "wf-2",
      ]);
    });

    it("DELETE /api/v1/workflow rejects duplicate workflow ids", async () => {
      const response = await request(app.getHttpServer())
        .delete("/api/v1/workflow")
        .send({ ids: ["wf-1", "wf-1"] });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["ids"],
            message: "Workflow ids must be unique",
          }),
        ]),
      );
      expect(workflowService.deleteManyWorkflow).not.toHaveBeenCalled();
    });

    it("GET /api/v1/workflow/:id returns one workflow", async () => {
      const data = { id: "wf-1", name: "Build pipeline" };
      workflowService.getOneWorkflowById.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).get("/api/v1/workflow/wf-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Workflow successfully retrieve",
        data,
        error: null,
      });
      expect(workflowService.getOneWorkflowById).toHaveBeenCalledWith("wf-1", "user-1");
    });
  });

  describe("action routes", () => {
    it("GET /api/v1/action/:workflowId returns workflow actions", async () => {
      const data = [{ id: "action-1", step: 1 }];
      actionService.getAllActionsByWorkflowId.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).get("/api/v1/action/wf-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Actions successfully retrieved",
        data,
        error: null,
      });
      expect(actionService.getAllActionsByWorkflowId).toHaveBeenCalledWith("wf-1", "user-1");
    });

    it("POST /api/v1/action/:workflowId creates an action", async () => {
      const body = {
        platform: Platform.GitHub,
        type: ActionTypes.webhook,
        step: 1,
        config: {
          url: "https://example.com/webhook",
        },
      };
      const data = { id: "action-1", workflowId: "wf-1", ...body };
      actionService.createAction.mockResolvedValue(data);

      const response = await request(app.getHttpServer())
        .post("/api/v1/action/wf-1")
        .send(body);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: "Action successfully created",
        data,
        error: null,
      });
      expect(actionService.createAction).toHaveBeenCalledWith("wf-1", "user-1", body);
    });

    it("GET /api/v1/action/id/:id returns one action", async () => {
      const data = { id: "action-1", step: 1 };
      actionService.getOneActionById.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).get("/api/v1/action/id/action-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Action successfully retrieved",
        data,
        error: null,
      });
      expect(actionService.getOneActionById).toHaveBeenCalledWith("action-1", "user-1");
    });

    it("DELETE /api/v1/action/:workflowId deletes workflow actions", async () => {
      const data = { workflowId: "wf-1", deletedCount: 3 };
      actionService.deleteAllActionsByWorkflowId.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).delete("/api/v1/action/wf-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Actions deleted successfully",
        data,
        error: null,
      });
      expect(actionService.deleteAllActionsByWorkflowId).toHaveBeenCalledWith("wf-1", "user-1");
    });

    it("DELETE /api/v1/action/id/:id deletes one action", async () => {
      const data = { id: "action-1", workflowId: "wf-1", step: 1 };
      actionService.deleteActionById.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).delete("/api/v1/action/id/action-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Action deleted successfully",
        data,
        error: null,
      });
      expect(actionService.deleteActionById).toHaveBeenCalledWith("action-1", "user-1");
    });
  });

  describe("github routes", () => {
    it("POST /api/v1/github/connect returns the connect URL", async () => {
      githubService.connect.mockResolvedValue("https://github.com/apps/shobapp24");

      const response = await request(app.getHttpServer()).post("/api/v1/github/connect");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "GitHub connect URL generated",
        data: "https://github.com/apps/shobapp24",
        error: null,
      });
      expect(githubService.connect).toHaveBeenCalledWith("user-1");
    });

    it("GET /api/v1/github/callback completes the callback flow", async () => {
      githubService.callback.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .get("/api/v1/github/callback?installation_id=12&state=state-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "GitHub account connected successfully",
        data: true,
        error: null,
      });
      expect(githubService.callback).toHaveBeenCalledWith(
        { installation_id: "12", state: "state-1" },
        "user-1",
      );
    });

    it("POST /api/v1/github/webhook rejects invalid webhook signatures", async () => {
      (verifyGitHubWebhook as jest.Mock).mockReturnValue(false);

      const response = await request(app.getHttpServer())
        .post("/api/v1/github/webhook")
        .set("Content-Type", "application/json")
        .set("x-hub-signature-256", "sha256=invalid")
        .set("x-github-event", EventType.push)
        .send(JSON.stringify({ repository: { id: 1 } }));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid webhook signature");
      expect(githubService.receiveWebhookFromGitHub).not.toHaveBeenCalled();
      expect(verifyGitHubWebhook).toHaveBeenCalledWith(
        expect.any(Buffer),
        "sha256=invalid",
        "top-secret",
      );
    });

    it("POST /api/v1/github/webhook rejects invalid JSON payloads", async () => {
      (verifyGitHubWebhook as jest.Mock).mockReturnValue(true);

      const response = await request(app.getHttpServer())
        .post("/api/v1/github/webhook")
        .set("Content-Type", "application/json")
        .set("x-hub-signature-256", "sha256=valid")
        .set("x-github-event", EventType.push)
        .send("{");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid JSON payload");
      expect(githubService.receiveWebhookFromGitHub).not.toHaveBeenCalled();
    });

    it("POST /api/v1/github/webhook accepts valid webhook payloads", async () => {
      const payload = { repository: { id: 1 }, action: "opened" };
      (verifyGitHubWebhook as jest.Mock).mockReturnValue(true);
      githubService.receiveWebhookFromGitHub.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post("/api/v1/github/webhook")
        .set("Content-Type", "application/json")
        .set("x-hub-signature-256", "sha256=valid")
        .set("x-github-event", EventType.push)
        .send(JSON.stringify(payload));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Webhook data received successfully",
        data: null,
        error: null,
      });
      expect(githubService.receiveWebhookFromGitHub).toHaveBeenCalledWith(payload, EventType.push);
    });

    it("GET /api/v1/github/repos returns paginated repos", async () => {
      const data = {
        data: [{ id: "repo-1", name: "repo-one" }],
        pagination: {
          currentPage: 2,
          pageSize: 10,
        },
      };
      githubService.getAllUserRepo.mockResolvedValue(data);

      const response = await request(app.getHttpServer())
        .get("/api/v1/github/repos?page=2&limit=10");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Here's the repo data",
        data,
        error: null,
      });
      expect(githubService.getAllUserRepo).toHaveBeenCalledWith("user-1", 10, 2);
    });

    it("GET /api/v1/github/repos rejects oversized limits", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/github/repos?limit=50");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Limit is too big");
      expect(githubService.getAllUserRepo).not.toHaveBeenCalled();
    });
  });

  describe("auth routes", () => {
    it("POST /api/v1/auth/sign-up/email signs up a user", async () => {
      authService.signUp.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/sign-up/email")
        .send({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: "If email is valid the you'll get an email",
        data: null,
        error: null,
      });
      expect(authService.signUp).toHaveBeenCalledWith({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
    });

    it("POST /api/v1/auth/sign-up/email rejects invalid passwords", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/sign-up/email")
        .send({
          name: "Test User",
          email: "test@example.com",
          password: "short",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["password"],
          }),
        ]),
      );
      expect(authService.signUp).not.toHaveBeenCalled();
    });

    it("GET /api/v1/auth/verify-email verifies email and sets a cookie", async () => {
      authService.verifyEmail.mockResolvedValue("session=1; Path=/; HttpOnly");

      const response = await request(app.getHttpServer())
        .get("/api/v1/auth/verify-email?token=verify-token");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Email verified successfully",
        data: null,
        error: null,
      });
      expect(response.headers["set-cookie"]).toEqual(["session=1; Path=/; HttpOnly"]);
      expect(authService.verifyEmail).toHaveBeenCalledWith(
        { token: "verify-token" },
        expect.objectContaining({
          session: { user: { id: "user-1" } },
        }),
      );
    });

    it("GET /api/v1/auth/verify-email requires a token", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/auth/verify-email");

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["token"],
          }),
        ]),
      );
      expect(authService.verifyEmail).not.toHaveBeenCalled();
    });

    it("POST /api/v1/auth/sign-in/email logs in a user and sets a cookie", async () => {
      authService.login.mockResolvedValue("session=1; Path=/; HttpOnly");

      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/sign-in/email")
        .send({
          email: "test@example.com",
          password: "password123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "You've logged in successfully",
        data: null,
        error: null,
      });
      expect(response.headers["set-cookie"]).toEqual(["session=1; Path=/; HttpOnly"]);
      expect(authService.login).toHaveBeenCalledWith(
        {
          email: "test@example.com",
          password: "password123",
        },
        expect.objectContaining({
          session: { user: { id: "user-1" } },
        }),
      );
    });

    it("POST /api/v1/auth/sign-in/email rejects invalid email payloads", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/sign-in/email")
        .send({
          email: "not-an-email",
          password: "password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["email"],
          }),
        ]),
      );
      expect(authService.login).not.toHaveBeenCalled();
    });

    it("POST /api/v1/auth/resend-verify-email resends the verification email", async () => {
      authService.resendVerifyEmail.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/resend-verify-email")
        .send({
          email: "test@example.com",
          password: "password123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "The email has been sent",
        data: null,
        error: null,
      });
      expect(authService.resendVerifyEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("POST /api/v1/auth/sign-out logs out the current session", async () => {
      authService.logout.mockResolvedValue({ ok: true });

      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/sign-out")
        .set("Cookie", "__Secure-shobapp24.session_token=session-token");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Logged out successfully",
        data: null,
        error: null,
      });
      expect(authService.logout).toHaveBeenCalledWith(
        "session-token",
        expect.objectContaining({
          cookies: expect.objectContaining({
            "__Secure-shobapp24.session_token": "session-token",
          }),
        }),
      );
    });

    it("POST /api/v1/auth/sign-out rejects requests without a session cookie", async () => {
      const response = await request(app.getHttpServer()).post("/api/v1/auth/sign-out");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "No session token provided",
      });
      expect(authService.logout).not.toHaveBeenCalled();
    });

    it("POST /api/v1/auth/request-password-reset requests a reset email", async () => {
      authService.requestPasswordReset.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/request-password-reset")
        .send({ email: "test@example.com" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Check your email for the reset link",
        data: null,
        error: null,
      });
      expect(authService.requestPasswordReset).toHaveBeenCalledWith({
        email: "test@example.com",
      });
    });

    it("POST /api/v1/auth/reset-password/:token resets the password", async () => {
      authService.resetPassword.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/reset-password/reset-token")
        .send({ password: "new-password123" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "The password has been changed",
        data: null,
        error: null,
      });
      expect(authService.resetPassword).toHaveBeenCalledWith({
        token: "reset-token",
        password: "new-password123",
      });
    });

    it("POST /api/v1/auth/reset-password/:token rejects invalid passwords", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/reset-password/reset-token")
        .send({ password: "short" });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["password"],
          }),
        ]),
      );
      expect(authService.resetPassword).not.toHaveBeenCalled();
    });

    it("POST /api/v1/auth/change-password changes the password", async () => {
      authService.changePassword.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/change-password")
        .send({
          currentPassword: "old-password123",
          newPassword: "new-password123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "The password has been changed",
        data: null,
        error: null,
      });
      expect(authService.changePassword).toHaveBeenCalledWith(
        expect.objectContaining({
          host: expect.any(String),
        }),
        {
          currentPassword: "old-password123",
          newPassword: "new-password123",
        },
      );
    });

    it("GET /api/v1/auth/get-session returns session data", async () => {
      const session = {
        user: {
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
        },
        session: {
          expiresAt: "2026-05-01T00:00:00.000Z",
        },
      };
      authService.getSession.mockResolvedValue(session);

      const response = await request(app.getHttpServer()).get("/api/v1/auth/get-session");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(session);
      expect(authService.getSession).toHaveBeenCalledWith(
        expect.objectContaining({
          host: expect.any(String),
        }),
      );
    });
  });
});
