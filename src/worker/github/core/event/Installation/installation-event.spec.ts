import { Installation_event } from "./installation-event";
import { createPayload, createPrismaMock } from "../test-helpers";

describe("Installation_event", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("creates the github connection and repositories on created", async () => {
    const prisma = createPrismaMock();
    const tx = {
      githubConnection: {
        create: jest.fn().mockResolvedValue({ id: "conn-1" }),
      },
      gitHubRepo: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    const payload = createPayload();
    const instance = new Installation_event(prisma as any);

    const result = await instance.Installation_event({
      event: "installation",
      data: payload,
    } as any);

    expect(tx.githubConnection.create).toHaveBeenCalled();
    expect(tx.gitHubRepo.createMany).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("deletes the github connection and repos on deleted", async () => {
    const prisma = createPrismaMock();
    const tx = {
      githubConnection: {
        delete: jest.fn().mockResolvedValue({ id: "conn-1" }),
      },
      gitHubRepo: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    const instance = new Installation_event(prisma as any);

    const result = await instance.Installation_event({
      event: "installation",
      data: createPayload({ action: "deleted" }),
    } as any);

    expect(tx.githubConnection.delete).toHaveBeenCalled();
    expect(tx.gitHubRepo.deleteMany).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("skips createMany when created installation has no repositories", async () => {
    const prisma = createPrismaMock();
    const tx = {
      githubConnection: {
        create: jest.fn().mockResolvedValue({ id: "conn-1" }),
      },
      gitHubRepo: {
        createMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    const instance = new Installation_event(prisma as any);

    const result = await instance.Installation_event({
      event: "installation",
      data: createPayload({ repositories: [] }),
    } as any);

    expect(tx.githubConnection.create).toHaveBeenCalled();
    expect(tx.gitHubRepo.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it.each(["new_permissions_accepted", "suspend", "unsuspend"])(
    "returns success for %s actions without mutating data",
    async (action) => {
      const prisma = createPrismaMock();
      const instance = new Installation_event(prisma as any);

      const result = await instance.Installation_event({
        event: "installation",
        data: createPayload({ action }),
      } as any);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    }
  );

  it("logs and returns success for unknown installation actions", async () => {
    const prisma = createPrismaMock();
    const instance = new Installation_event(prisma as any);

    const result = await instance.Installation_event({
      event: "installation",
      data: createPayload({ action: "mystery_action" }),
    } as any);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Unknown installation action: mystery_action"
    );
    expect(result).toEqual({ success: true });
  });

  it("returns a retryable failure when the transaction throws", async () => {
    const prisma = createPrismaMock();
    const error = new Error("db down");
    prisma.$transaction.mockRejectedValue(error);
    const instance = new Installation_event(prisma as any);

    const result = await instance.Installation_event({
      event: "installation",
      data: createPayload(),
    } as any);

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    expect(result).toEqual({
      success: false,
      message: "",
      allUpTo: false,
      requeue: true,
    });
  });
});
