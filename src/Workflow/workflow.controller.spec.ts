import {
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";

describe("WorkflowController", () => {
  let controller: WorkflowController;
  let workflowServiceMock: Record<string, jest.Mock>;
  let configServiceMock: { get: jest.Mock };

  beforeEach(async () => {
    workflowServiceMock = {
      createWorkflow: jest.fn(),
      getAllWorkflow: jest.fn(),
      updateWorkflow: jest.fn(),
      deleteOneWorkflowById: jest.fn(),
      deleteManyWorkflow: jest.fn(),
      getOneWorkflowById: jest.fn(),
    };

    configServiceMock = {
      get: jest.fn().mockImplementation((key: string) =>
        key === "MAX_LIMIT" ? 50 : undefined
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowController],
      providers: [
        {
          provide: WorkflowService,
          useValue: workflowServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    controller = module.get<WorkflowController>(WorkflowController);
  });

  describe("createWorkflow", () => {
    const req = { session: { user: { id: "user-1" } } } as any;
    const body = {
      name: "Build",
      repoId: "repo-1",
      platform: "GitHub",
      eventType: "push",
      action: "",
    } as any;

    it("returns the standardized success payload", async () => {
      const workflow = { id: "wf-1", ...body };
      workflowServiceMock.createWorkflow.mockResolvedValue(workflow);

      await expect(controller.createWorkflow(req, body)).resolves.toEqual({
        success: true,
        message: "Workflow created successfully",
        data: workflow,
        error: null,
      });
      expect(workflowServiceMock.createWorkflow).toHaveBeenCalledWith("user-1", body);
    });

    it("rethrows HttpException errors from the service", async () => {
      const error = new NotFoundException("repo not found");
      workflowServiceMock.createWorkflow.mockRejectedValue(error);

      await expect(controller.createWorkflow(req, body)).rejects.toBe(error);
    });

    it("wraps unknown errors in InternalServerErrorException", async () => {
      workflowServiceMock.createWorkflow.mockRejectedValue(new Error("boom"));

      await expect(controller.createWorkflow(req, body)).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
    });
  });

  describe("getAllWorkflow", () => {
    const req = { session: { user: { id: "user-1" } } } as any;

    it("returns workflows using parsed page and limit values", async () => {
      const workflow = {
        data: [{ id: "wf-1", name: "Build" }],
        pagination: {
          totalItems: 1,
          currentPage: 2,
          totalPages: 1,
          pageSize: 10,
          hasNextPage: false,
          hasPrevPage: true,
        },
      };
      workflowServiceMock.getAllWorkflow.mockResolvedValue(workflow);

      await expect(
        controller.getAllWorkflow(req, { page: "2", limit: "10" })
      ).resolves.toEqual({
        success: true,
        message: "Here's the workflow data",
        data: workflow,
        error: null,
      });
      expect(workflowServiceMock.getAllWorkflow).toHaveBeenCalledWith(
        "user-1",
        10,
        2
      );
    });

    it("uses default pagination values when query params are invalid", async () => {
      workflowServiceMock.getAllWorkflow.mockResolvedValue({ data: [], pagination: {} });

      await controller.getAllWorkflow(req, { page: "x", limit: "0" });

      expect(workflowServiceMock.getAllWorkflow).toHaveBeenCalledWith(
        "user-1",
        10,
        1
      );
    });

    it("throws BadRequestException when limit reaches MAX_LIMIT", async () => {
      await expect(
        controller.getAllWorkflow(req, { page: "1", limit: "50" })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(workflowServiceMock.getAllWorkflow).not.toHaveBeenCalled();
    });

    it("wraps unknown errors in InternalServerErrorException", async () => {
      workflowServiceMock.getAllWorkflow.mockRejectedValue(new Error("boom"));

      await expect(
        controller.getAllWorkflow(req, { page: "1", limit: "10" })
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it("rethrows HttpException errors from the service", async () => {
      const error = new NotFoundException("missing");
      workflowServiceMock.getAllWorkflow.mockRejectedValue(error);

      await expect(
        controller.getAllWorkflow(req, { page: "1", limit: "10" })
      ).rejects.toBe(error);
    });

    it("uses the default MAX_LIMIT when config is missing", async () => {
      const fallbackController = new WorkflowController(workflowServiceMock as any, {
        get: jest.fn().mockReturnValue(undefined),
      } as any);
      workflowServiceMock.getAllWorkflow.mockResolvedValue({
        data: [],
        pagination: {},
      });

      await fallbackController.getAllWorkflow(req, { page: "1", limit: "99" });

      expect(workflowServiceMock.getAllWorkflow).toHaveBeenCalledWith(
        "user-1",
        99,
        1
      );
    });
  });

  describe("updateWorkflow", () => {
    const req = { session: { user: { id: "user-1" } } } as any;
    const body = { name: "Updated", enabled: true } as any;

    it("returns the standardized success payload", async () => {
      const workflow = { id: "wf-1", ...body };
      workflowServiceMock.updateWorkflow.mockResolvedValue(workflow);

      await expect(controller.updateWorkflow(req, "wf-1", body)).resolves.toEqual({
        success: true,
        message: "Workflow updated successfully",
        data: workflow,
        error: null,
      });
      expect(workflowServiceMock.updateWorkflow).toHaveBeenCalledWith(
        "wf-1",
        "user-1",
        body
      );
    });

    it("rethrows HttpException errors from the service", async () => {
      const error = new NotFoundException();
      workflowServiceMock.updateWorkflow.mockRejectedValue(error);

      await expect(controller.updateWorkflow(req, "wf-1", body)).rejects.toBe(error);
    });

    it("wraps unknown errors in InternalServerErrorException", async () => {
      workflowServiceMock.updateWorkflow.mockRejectedValue(new Error("boom"));

      await expect(
        controller.updateWorkflow(req, "wf-1", body)
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe("deleteOneWorkflowById", () => {
    const req = { session: { user: { id: "user-1" } } } as any;

    it("returns the standardized success payload", async () => {
      const workflow = { id: "wf-1", name: "Build" };
      workflowServiceMock.deleteOneWorkflowById.mockResolvedValue(workflow);

      await expect(controller.deleteOneWorkflowById(req, "wf-1")).resolves.toEqual({
        success: true,
        message: "Workflow deleted successfully",
        data: workflow,
        error: null,
      });
      expect(workflowServiceMock.deleteOneWorkflowById).toHaveBeenCalledWith(
        "wf-1",
        "user-1"
      );
    });

    it("rethrows HttpException errors from the service", async () => {
      const error = new NotFoundException("missing");
      workflowServiceMock.deleteOneWorkflowById.mockRejectedValue(error);

      await expect(controller.deleteOneWorkflowById(req, "wf-1")).rejects.toBe(
        error
      );
    });

    it("wraps unknown errors in InternalServerErrorException", async () => {
      workflowServiceMock.deleteOneWorkflowById.mockRejectedValue(new Error("boom"));

      await expect(
        controller.deleteOneWorkflowById(req, "wf-1")
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe("deleteManyWorkflow", () => {
    const req = { session: { user: { id: "user-1" } } } as any;
    const body = { ids: ["wf-1", "wf-2"] };

    it("returns the standardized success payload", async () => {
      const workflow = { deletedCount: 2, ids: body.ids };
      workflowServiceMock.deleteManyWorkflow.mockResolvedValue(workflow);

      await expect(controller.deleteManyWorkflow(req, body)).resolves.toEqual({
        success: true,
        message: "Workflows deleted successfully",
        data: workflow,
        error: null,
      });
      expect(workflowServiceMock.deleteManyWorkflow).toHaveBeenCalledWith(
        "user-1",
        body.ids
      );
    });

    it("rethrows HttpException errors from the service", async () => {
      const error = new HttpException("invalid", HttpStatus.BAD_REQUEST);
      workflowServiceMock.deleteManyWorkflow.mockRejectedValue(error);

      await expect(controller.deleteManyWorkflow(req, body)).rejects.toBe(error);
    });

    it("wraps unknown errors in InternalServerErrorException", async () => {
      workflowServiceMock.deleteManyWorkflow.mockRejectedValue(new Error("boom"));

      await expect(
        controller.deleteManyWorkflow(req, body)
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe("getOneWorkflowById", () => {
    const req = { session: { user: { id: "user-1" } } } as any;

    it("returns the standardized success payload", async () => {
      const workflow = { id: "wf-1", name: "Build" };
      workflowServiceMock.getOneWorkflowById.mockResolvedValue(workflow);

      await expect(controller.getOneWorkflowById(req, "wf-1")).resolves.toEqual({
        success: true,
        message: "Workflow successfully retrieve",
        data: workflow,
        error: null,
      });
      expect(workflowServiceMock.getOneWorkflowById).toHaveBeenCalledWith(
        "wf-1",
        "user-1"
      );
    });

    it("rethrows HttpException errors from the service", async () => {
      const error = new NotFoundException("missing");
      workflowServiceMock.getOneWorkflowById.mockRejectedValue(error);

      await expect(controller.getOneWorkflowById(req, "wf-1")).rejects.toBe(error);
    });

    it("wraps unknown errors in InternalServerErrorException", async () => {
      workflowServiceMock.getOneWorkflowById.mockRejectedValue(new Error("boom"));

      await expect(
        controller.getOneWorkflowById(req, "wf-1")
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });
});
