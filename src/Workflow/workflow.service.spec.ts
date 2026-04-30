import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowService } from "./workflow.service";

describe("WorkflowService", () => {
  let service: WorkflowService;
  let prismaMock: {
    workflow: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      workflow: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
  });

  describe("createWorkflow", () => {
    const userId = "user-1" as any;
    const body = {
      name: "Deploy workflow",
      repoId: "repo-1",
      platform: "GitHub",
      eventType: "push",
      action: "",
      config: { branch: "main" },
    } as any;

    it("creates and returns a workflow", async () => {
      const workflow = { id: "wf-1", userId, ...body };
      prismaMock.workflow.create.mockResolvedValue(workflow);

      await expect(service.createWorkflow(userId, body)).resolves.toBe(workflow);
      expect(prismaMock.workflow.create).toHaveBeenCalledWith({
        data: {
          userId,
          ...body,
        },
      });
    });

    it("throws NotFoundException when prisma returns P2003", async () => {
      const error = Object.assign(
        Object.create(PrismaClientKnownRequestError.prototype),
        { code: "P2003" }
      );
      prismaMock.workflow.create.mockRejectedValue(error);

      await expect(service.createWorkflow(userId, body)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("rethrows non-prisma errors", async () => {
      const error = new Error("upstream");
      prismaMock.workflow.create.mockRejectedValue(error);

      await expect(service.createWorkflow(userId, body)).rejects.toBe(error);
    });
  });

  describe("getOneWorkflowById", () => {
    const userId = "user-1" as any;

    it("returns the workflow when it exists", async () => {
      const workflow = { id: "wf-1", userId, name: "Build" };
      prismaMock.workflow.findUnique.mockResolvedValue(workflow);

      await expect(service.getOneWorkflowById("wf-1", userId)).resolves.toBe(
        workflow
      );
      expect(prismaMock.workflow.findUnique).toHaveBeenCalledWith({
        where: {
          id: "wf-1",
          userId,
        },
      });
    });

    it("throws NotFoundException when the workflow does not exist", async () => {
      prismaMock.workflow.findUnique.mockResolvedValue(null);

      await expect(
        service.getOneWorkflowById("wf-1", userId)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rethrows upstream errors", async () => {
      const error = new Error("upstream");
      prismaMock.workflow.findUnique.mockRejectedValue(error);

      await expect(service.getOneWorkflowById("wf-1", userId)).rejects.toBe(error);
    });
  });

  describe("getAllWorkflow", () => {
    const userId = "user-1" as any;

    it("returns workflows with pagination metadata", async () => {
      const workflows = [
        { id: "wf-2", name: "Deploy" },
        { id: "wf-1", name: "Build" },
      ];
      prismaMock.workflow.count.mockReturnValue("count-query");
      prismaMock.workflow.findMany.mockReturnValue("find-query");
      prismaMock.$transaction.mockResolvedValue([3, workflows]);

      await expect(service.getAllWorkflow(userId, 2, 2)).resolves.toEqual({
        data: workflows,
        pagination: {
          totalItems: 3,
          currentPage: 2,
          totalPages: 2,
          pageSize: 2,
          hasNextPage: false,
          hasPrevPage: true,
        },
      });
      expect(prismaMock.workflow.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(prismaMock.workflow.findMany).toHaveBeenCalledWith({
        where: { userId },
        skip: 2,
        take: 2,
        orderBy: { createdAt: "desc" },
        omit: { config: true },
      });
      expect(prismaMock.$transaction).toHaveBeenCalledWith([
        "count-query",
        "find-query",
      ]);
    });

    it("returns empty pagination metadata when no workflows exist", async () => {
      prismaMock.workflow.count.mockReturnValue("count-query");
      prismaMock.workflow.findMany.mockReturnValue("find-query");
      prismaMock.$transaction.mockResolvedValue([0, []]);

      await expect(service.getAllWorkflow(userId, 10, 1)).resolves.toEqual({
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

    it("rethrows transaction errors", async () => {
      const error = new Error("transaction failed");
      prismaMock.workflow.count.mockReturnValue("count-query");
      prismaMock.workflow.findMany.mockReturnValue("find-query");
      prismaMock.$transaction.mockRejectedValue(error);

      await expect(service.getAllWorkflow(userId, 10, 1)).rejects.toBe(error);
    });
  });

  describe("updateWorkflow", () => {
    const userId = "user-1" as any;
    const body = { name: "Updated name", enabled: true } as any;

    it("updates and returns selected fields when the workflow exists", async () => {
      const updatedWorkflow = {
        id: "wf-1",
        name: "Updated name",
        enabled: true,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      };
      prismaMock.workflow.findFirst.mockResolvedValue({ id: "wf-1" });
      prismaMock.workflow.update.mockResolvedValue(updatedWorkflow);

      await expect(
        service.updateWorkflow("wf-1", userId, body)
      ).resolves.toBe(updatedWorkflow);
      expect(prismaMock.workflow.findFirst).toHaveBeenCalledWith({
        where: {
          id: "wf-1",
          userId,
        },
        select: {
          id: true,
        },
      });
      expect(prismaMock.workflow.update).toHaveBeenCalledWith({
        where: {
          id: "wf-1",
        },
        data: body,
        select: {
          id: true,
          name: true,
          enabled: true,
          updatedAt: true,
        },
      });
    });

    it("throws NotFoundException when the workflow does not exist", async () => {
      prismaMock.workflow.findFirst.mockResolvedValue(null);

      await expect(
        service.updateWorkflow("wf-1", userId, body)
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.workflow.update).not.toHaveBeenCalled();
    });

    it("rethrows update errors after the workflow is found", async () => {
      const error = new Error("update failed");
      prismaMock.workflow.findFirst.mockResolvedValue({ id: "wf-1" });
      prismaMock.workflow.update.mockRejectedValue(error);

      await expect(service.updateWorkflow("wf-1", userId, body)).rejects.toBe(
        error
      );
    });
  });

  describe("deleteOneWorkflowById", () => {
    const userId = "user-1" as any;

    it("deletes and returns the workflow summary when it exists", async () => {
      const workflow = { id: "wf-1", name: "Build" };
      prismaMock.workflow.findFirst.mockResolvedValue(workflow);
      prismaMock.workflow.delete.mockResolvedValue({ id: "wf-1" });

      await expect(
        service.deleteOneWorkflowById("wf-1", userId)
      ).resolves.toBe(workflow);
      expect(prismaMock.workflow.findFirst).toHaveBeenCalledWith({
        where: {
          id: "wf-1",
          userId,
        },
        select: {
          id: true,
          name: true,
        },
      });
      expect(prismaMock.workflow.delete).toHaveBeenCalledWith({
        where: {
          id: "wf-1",
        },
      });
    });

    it("throws NotFoundException when the workflow does not exist", async () => {
      prismaMock.workflow.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteOneWorkflowById("wf-1", userId)
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.workflow.delete).not.toHaveBeenCalled();
    });

    it("rethrows delete errors after the workflow is found", async () => {
      const error = new Error("delete failed");
      prismaMock.workflow.findFirst.mockResolvedValue({ id: "wf-1", name: "Build" });
      prismaMock.workflow.delete.mockRejectedValue(error);

      await expect(service.deleteOneWorkflowById("wf-1", userId)).rejects.toBe(
        error
      );
    });
  });

  describe("deleteManyWorkflow", () => {
    const userId = "user-1" as any;
    const ids = ["wf-1", "wf-2"];

    it("deletes all matched workflows inside a transaction", async () => {
      const tx = {
        workflow: {
          count: jest.fn().mockResolvedValue(2),
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback(tx)
      );

      await expect(service.deleteManyWorkflow(userId, ids)).resolves.toEqual({
        deletedCount: 2,
        ids,
      });
      expect(tx.workflow.count).toHaveBeenCalledWith({
        where: {
          userId,
          id: {
            in: ids,
          },
        },
      });
      expect(tx.workflow.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          id: {
            in: ids,
          },
        },
      });
    });

    it("throws NotFoundException when some workflow ids do not belong to the user", async () => {
      const tx = {
        workflow: {
          count: jest.fn().mockResolvedValue(1),
          deleteMany: jest.fn(),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback(tx)
      );

      await expect(service.deleteManyWorkflow(userId, ids)).rejects.toBeInstanceOf(
        NotFoundException
      );
      expect(tx.workflow.deleteMany).not.toHaveBeenCalled();
    });

    it("rethrows transaction errors", async () => {
      const error = new Error("transaction failed");
      prismaMock.$transaction.mockRejectedValue(error);

      await expect(service.deleteManyWorkflow(userId, ids)).rejects.toBe(error);
    });

    it("rethrows deleteMany errors from inside the transaction", async () => {
      const error = new Error("deleteMany failed");
      const tx = {
        workflow: {
          count: jest.fn().mockResolvedValue(2),
          deleteMany: jest.fn().mockRejectedValue(error),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback(tx)
      );

      await expect(service.deleteManyWorkflow(userId, ids)).rejects.toBe(error);
    });
  });
});
