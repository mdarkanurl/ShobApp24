import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ActionTypes, Platform } from "@prisma/client";
import { ActionController } from "./action.controller";
import { ActionService } from "./action.service";

describe("ActionController", () => {
  let controller: ActionController;
  let actionServiceMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    actionServiceMock = {
      getAllActionsByWorkflowId: jest.fn(),
      createAction: jest.fn(),
      getOneActionById: jest.fn(),
      deleteAllActionsByWorkflowId: jest.fn(),
      deleteActionById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionController],
      providers: [
        {
          provide: ActionService,
          useValue: actionServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ActionController>(ActionController);
  });

  describe("getAllActionsByWorkflowId", () => {
    const req = { session: { user: { id: "user-1" } } } as any;
    const workflowId = "wf-1";

    it("returns the standardized success payload", async () => {
      const actions = [{ id: "action-1", step: 1 }];
      actionServiceMock.getAllActionsByWorkflowId.mockResolvedValue(actions);

      await expect(
        controller.getAllActionsByWorkflowId(req, workflowId)
      ).resolves.toEqual({
        success: true,
        message: "Actions successfully retrieved",
        data: actions,
        error: null,
      });
      expect(actionServiceMock.getAllActionsByWorkflowId).toHaveBeenCalledWith(
        workflowId,
        "user-1"
      );
    });

    it("rethrows HttpException errors from the service", async () => {
      const error = new NotFoundException("Workflow not found");
      actionServiceMock.getAllActionsByWorkflowId.mockRejectedValue(error);

      await expect(
        controller.getAllActionsByWorkflowId(req, workflowId)
      ).rejects.toBe(error);
    });

    it("wraps unknown errors in InternalServerErrorException", async () => {
      actionServiceMock.getAllActionsByWorkflowId.mockRejectedValue(new Error("boom"));

      await expect(
        controller.getAllActionsByWorkflowId(req, workflowId)
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe("createAction", () => {
    const req = { session: { user: { id: "user-1" } } } as any;
    const workflowId = "wf-1";
    const body = {
      platform: Platform.GitHub,
      type: ActionTypes.webhook,
      step: 1,
      config: {
        url: "https://example.com/webhook",
      },
    } as any;

    it("returns the standardized success payload", async () => {
      const action = { id: "action-1", workflowId, ...body };
      actionServiceMock.createAction.mockResolvedValue(action);

      await expect(controller.createAction(req, workflowId, body)).resolves.toEqual({
        success: true,
        message: "Action successfully created",
        data: action,
        error: null,
      });
      expect(actionServiceMock.createAction).toHaveBeenCalledWith(
        workflowId,
        "user-1",
        body
      );
    });

    it("rethrows HttpException errors from the service", async () => {
      const error = new NotFoundException("Workflow not found");
      actionServiceMock.createAction.mockRejectedValue(error);

      await expect(controller.createAction(req, workflowId, body)).rejects.toBe(error);
    });

    it("wraps unknown errors in InternalServerErrorException", async () => {
      actionServiceMock.createAction.mockRejectedValue(new Error("boom"));

      await expect(
        controller.createAction(req, workflowId, body)
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe("getOneActionById", () => {
    const req = { session: { user: { id: "user-1" } } } as any;
    const actionId = "action-1";

    it("returns the standardized success payload", async () => {
      const action = { id: actionId, step: 1 };
      actionServiceMock.getOneActionById.mockResolvedValue(action);

      await expect(controller.getOneActionById(req, actionId)).resolves.toEqual({
        success: true,
        message: "Action successfully retrieved",
        data: action,
        error: null,
      });
      expect(actionServiceMock.getOneActionById).toHaveBeenCalledWith(
        actionId,
        "user-1"
      );
    });
  });

  describe("deleteAllActionsByWorkflowId", () => {
    const req = { session: { user: { id: "user-1" } } } as any;
    const workflowId = "wf-1";

    it("returns the standardized success payload", async () => {
      const result = { workflowId, deletedCount: 3 };
      actionServiceMock.deleteAllActionsByWorkflowId.mockResolvedValue(result);

      await expect(
        controller.deleteAllActionsByWorkflowId(req, workflowId)
      ).resolves.toEqual({
        success: true,
        message: "Actions deleted successfully",
        data: result,
        error: null,
      });
      expect(actionServiceMock.deleteAllActionsByWorkflowId).toHaveBeenCalledWith(
        workflowId,
        "user-1"
      );
    });
  });

  describe("deleteActionById", () => {
    const req = { session: { user: { id: "user-1" } } } as any;
    const actionId = "action-1";

    it("returns the standardized success payload", async () => {
      const action = { id: actionId, workflowId: "wf-1", step: 1 };
      actionServiceMock.deleteActionById.mockResolvedValue(action);

      await expect(controller.deleteActionById(req, actionId)).resolves.toEqual({
        success: true,
        message: "Action deleted successfully",
        data: action,
        error: null,
      });
      expect(actionServiceMock.deleteActionById).toHaveBeenCalledWith(
        actionId,
        "user-1"
      );
    });
  });
});
