import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ActionTypes, EventType, Platform } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActionService } from "./action.service";

describe("ActionService", () => {
  let service: ActionService;
  let prismaMock: {
    workflow: {
      findUnique: jest.Mock;
    };
    action: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      workflow: {
        findUnique: jest.fn(),
      },
      action: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ActionService>(ActionService);
  });

  describe("getAllActionsByWorkflowId", () => {
    const workflowId = "wf-1";
    const userId = "user-1" as any;

    it("returns ordered actions when the workflow belongs to the user", async () => {
      const actions = [
        { id: "action-1", workflowId, step: 1 },
        { id: "action-2", workflowId, step: 2 },
      ];
      prismaMock.workflow.findUnique.mockResolvedValue({ id: workflowId });
      prismaMock.action.findMany.mockResolvedValue(actions);

      await expect(
        service.getAllActionsByWorkflowId(workflowId, userId)
      ).resolves.toBe(actions);
      expect(prismaMock.workflow.findUnique).toHaveBeenCalledWith({
        where: {
          id: workflowId,
          userId,
        },
        select: {
          id: true,
        },
      });
      expect(prismaMock.action.findMany).toHaveBeenCalledWith({
        where: {
          workflowId,
        },
        orderBy: {
          step: "asc",
        },
      });
    });

    it("throws NotFoundException when the workflow does not belong to the user", async () => {
      prismaMock.workflow.findUnique.mockResolvedValue(null);

      await expect(
        service.getAllActionsByWorkflowId(workflowId, userId)
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.action.findMany).not.toHaveBeenCalled();
    });
  });

  describe("createAction", () => {
    const workflowId = "wf-1";
    const userId = "user-1" as any;
    const body = {
      platform: Platform.GitHub,
      type: ActionTypes.send_email_to_who_push_the_commit,
      step: 1,
      config: {
        subject: "Push update",
        body: "A new push happened",
        do_you_want_AI_analytics_of_push_data: false,
      },
    } as any;

    it("creates an action with stringified config when validation passes", async () => {
      const createdAction = { id: "action-1", workflowId, ...body };
      prismaMock.workflow.findUnique.mockResolvedValue({
        id: workflowId,
        eventType: EventType.push,
      });
      prismaMock.action.count.mockResolvedValue(0);
      prismaMock.action.create.mockResolvedValue(createdAction);

      await expect(service.createAction(workflowId, userId, body)).resolves.toBe(
        createdAction
      );
      expect(prismaMock.action.create).toHaveBeenCalledWith({
        data: {
          ...body,
          config: JSON.stringify(body.config),
          workflowId,
        },
      });
    });

    it("throws NotFoundException when the workflow does not belong to the user", async () => {
      prismaMock.workflow.findUnique.mockResolvedValue(null);

      await expect(
        service.createAction(workflowId, userId, body)
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.action.count).not.toHaveBeenCalled();
      expect(prismaMock.action.create).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when the action type is unsupported for the workflow event", async () => {
      const unsupportedBody = {
        platform: Platform.GitHub,
        type: ActionTypes.analytics_the_issue_and_give_rating,
        step: 1,
      } as any;
      prismaMock.workflow.findUnique.mockResolvedValue({
        id: workflowId,
        eventType: EventType.repository,
      });

      await expect(
        service.createAction(workflowId, userId, unsupportedBody)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.action.count).not.toHaveBeenCalled();
      expect(prismaMock.action.create).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when the step is not sequential", async () => {
      prismaMock.workflow.findUnique.mockResolvedValue({
        id: workflowId,
        eventType: EventType.push,
      });
      prismaMock.action.count.mockResolvedValue(1);

      await expect(
        service.createAction(workflowId, userId, body)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.action.create).not.toHaveBeenCalled();
    });
  });

  describe("getOneActionById", () => {
    const actionId = "action-1";
    const userId = "user-1" as any;

    it("returns the action when it belongs to the user", async () => {
      const action = {
        id: actionId,
        config: "{}",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        platform: Platform.GitHub,
        step: 1,
        type: ActionTypes.webhook,
        workflowId: "wf-1",
        workflow: {
          userId,
        },
      };
      prismaMock.action.findUnique.mockResolvedValue(action);

      await expect(service.getOneActionById(actionId, userId)).resolves.toBe(action);
      expect(prismaMock.action.findUnique).toHaveBeenCalledWith({
        where: {
          id: actionId,
        },
        select: {
          id: true,
          config: true,
          createdAt: true,
          platform: true,
          step: true,
          type: true,
          workflowId: true,
          workflow: {
            select: {
              userId: true,
            },
          },
        },
      });
    });

    it("throws NotFoundException when the action does not belong to the user", async () => {
      prismaMock.action.findUnique.mockResolvedValue({
        id: actionId,
        workflow: {
          userId: "other-user",
        },
      });

      await expect(service.getOneActionById(actionId, userId)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe("deleteAllActionsByWorkflowId", () => {
    const workflowId = "wf-1";
    const userId = "user-1" as any;

    it("deletes all actions for the workflow inside a transaction", async () => {
      const tx = {
        workflow: {
          findUnique: jest.fn().mockResolvedValue({ id: workflowId }),
        },
        action: {
          deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback(tx)
      );

      await expect(
        service.deleteAllActionsByWorkflowId(workflowId, userId)
      ).resolves.toEqual({
        workflowId,
        deletedCount: 3,
      });
      expect(tx.workflow.findUnique).toHaveBeenCalledWith({
        where: {
          id: workflowId,
          userId,
        },
        select: {
          id: true,
        },
      });
      expect(tx.action.deleteMany).toHaveBeenCalledWith({
        where: {
          workflowId,
        },
      });
    });

    it("throws NotFoundException when the workflow is not found", async () => {
      const tx = {
        workflow: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        action: {
          deleteMany: jest.fn(),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback(tx)
      );

      await expect(
        service.deleteAllActionsByWorkflowId(workflowId, userId)
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.action.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("deleteActionById", () => {
    const actionId = "action-1";
    const userId = "user-1" as any;

    it("deletes the action and compacts later steps inside a transaction", async () => {
      const action = {
        id: actionId,
        workflowId: "wf-1",
        step: 2,
        workflow: {
          userId,
        },
      };
      const tx = {
        action: {
          findFirst: jest.fn().mockResolvedValue(action),
          delete: jest.fn().mockResolvedValue({ id: actionId }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback(tx)
      );

      await expect(service.deleteActionById(actionId, userId)).resolves.toBe(action);
      expect(tx.action.findFirst).toHaveBeenCalledWith({
        where: {
          id: actionId,
        },
        select: {
          id: true,
          workflowId: true,
          step: true,
          workflow: {
            select: {
              userId: true,
            },
          },
        },
      });
      expect(tx.action.delete).toHaveBeenCalledWith({
        where: {
          id: actionId,
        },
      });
      expect(tx.action.updateMany).toHaveBeenCalledWith({
        where: {
          workflowId: "wf-1",
          step: {
            gt: 2,
          },
        },
        data: {
          step: {
            decrement: 1,
          },
        },
      });
    });

    it("throws NotFoundException when the action is not found for the user", async () => {
      const tx = {
        action: {
          findFirst: jest.fn().mockResolvedValue(null),
          delete: jest.fn(),
          updateMany: jest.fn(),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback(tx)
      );

      await expect(service.deleteActionById(actionId, userId)).rejects.toBeInstanceOf(
        NotFoundException
      );
      expect(tx.action.delete).not.toHaveBeenCalled();
      expect(tx.action.updateMany).not.toHaveBeenCalled();
    });
  });
});
