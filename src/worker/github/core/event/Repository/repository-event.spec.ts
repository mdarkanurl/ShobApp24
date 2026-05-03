import { Repository_event } from "./repository-event";
import { createPayload, createPrismaMock } from "../test-helpers";
import { collect_viewer_info } from "../../actions";
import { sendEmail } from "../../../../../utils/rabbitmq";

jest.mock("../../../../../utils/rabbitmq", () => ({
  sendEmail: jest.fn(),
}));

jest.mock("../../actions", () => ({
  collect_viewer_info: jest.fn(),
}));

describe("Repository_event", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("upserts repository state before executing a matching workflow", async () => {
    const prisma = createPrismaMock();
    prisma.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    const instance = new Repository_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest.spyOn(instance, "executeActions").mockResolvedValue({ success: true });

    const result = await instance.Repository_event({
      event: "repository",
      data: createPayload({ action: "edited" }),
    } as any);

    expect(prisma.gitHubRepo.upsert).toHaveBeenCalled();
    expect(prisma.workflowRun.create).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("deletes repository records for deleted actions", async () => {
    const prisma = createPrismaMock();
    prisma.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
    const instance = new Repository_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue(null);

    await instance.Repository_event({
      event: "repository",
      data: createPayload({ action: "deleted" }),
    } as any);

    expect(prisma.gitHubRepo.deleteMany).toHaveBeenCalledWith({
      where: {
        repoId: 202,
      },
    });
  });

  it("returns success when no github connection is found", async () => {
    const prisma = createPrismaMock();
    prisma.githubConnection.findFirst.mockResolvedValue(null);
    const instance = new Repository_event(prisma as any);

    await expect(
      instance.Repository_event({
        event: "repository",
        data: createPayload(),
      } as any)
    ).resolves.toEqual({ success: true });

    expect(prisma.gitHubRepo.upsert).not.toHaveBeenCalled();
    expect(prisma.gitHubRepo.deleteMany).not.toHaveBeenCalled();
  });

  it.each([
    "created",
    "renamed",
    "publicized",
    "privatized",
    "archived",
    "transferred",
    "unarchived",
  ])("upserts repository records for %s actions", async (action) => {
    const prisma = createPrismaMock();
    prisma.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
    const instance = new Repository_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue(null);

    await instance.Repository_event({
      event: "repository",
      data: createPayload({ action }),
    } as any);

    expect(prisma.gitHubRepo.upsert).toHaveBeenCalledWith({
      where: {
        repoId: 202,
      },
      create: {
        GithubConnectionsId: "conn-1",
        repoId: 202,
        name: "repo",
        full_name: "octo/repo",
        private: false,
      },
      update: {
        GithubConnectionsId: "conn-1",
        name: "repo",
        full_name: "octo/repo",
        private: false,
      },
    });
  });

  it("does not mutate repository records for unknown actions", async () => {
    const prisma = createPrismaMock();
    prisma.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
    const instance = new Repository_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue(null);

    await instance.Repository_event({
      event: "repository",
      data: createPayload({ action: "mystery_action" }),
    } as any);

    expect(prisma.gitHubRepo.upsert).not.toHaveBeenCalled();
    expect(prisma.gitHubRepo.deleteMany).not.toHaveBeenCalled();
  });

  it("returns success when no workflow matches after syncing repository data", async () => {
    const prisma = createPrismaMock();
    prisma.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
    const instance = new Repository_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue(null);

    await expect(
      instance.Repository_event({
        event: "repository",
        data: createPayload({ action: "created" }),
      } as any)
    ).resolves.toEqual({ success: true });

    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it("returns success when the workflow has no actions", async () => {
    const prisma = createPrismaMock();
    prisma.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
    prisma.action.findMany.mockResolvedValue([]);
    const instance = new Repository_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });

    await expect(
      instance.Repository_event({
        event: "repository",
        data: createPayload({ action: "created" }),
      } as any)
    ).resolves.toEqual({ success: true });

    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it("marks the workflow run failed when executeActions returns failure", async () => {
    const prisma = createPrismaMock();
    prisma.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    const instance = new Repository_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest.spyOn(instance, "executeActions").mockResolvedValue({
      success: false,
      message: "action failed",
      allUpTo: false,
      requeue: false,
    });

    const result = await instance.Repository_event({
      event: "repository",
      data: createPayload({ action: "created" }),
    } as any);

    expect(prisma.workflowRun.update).toHaveBeenCalledWith({
      where: {
        id: "run-1",
      },
      data: {
        status: "Failed",
        output: JSON.stringify("action failed"),
        finishedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      success: false,
      message: "action failed",
      allUpTo: false,
      requeue: false,
    });
  });

  it("marks the workflow run failed when executeActions throws", async () => {
    const prisma = createPrismaMock();
    prisma.githubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    prisma.workflowRun.update.mockResolvedValue(undefined);
    const instance = new Repository_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest.spyOn(instance, "executeActions").mockRejectedValue(new Error("boom"));

    const result = await instance.Repository_event({
      event: "repository",
      data: createPayload({ action: "created" }),
    } as any);

    expect(prisma.workflowRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: {
        status: "Failed",
        output: JSON.stringify(new Error("boom")),
        finishedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      success: false,
      message: "boom",
      allUpTo: false,
      requeue: true,
    });
  });

  it("returns cached viewer data when sender url exists", async () => {
    const instance = new Repository_event(createPrismaMock() as any);
    (collect_viewer_info as jest.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    const loader = (instance as any).createViewerDataLoader(createPayload());

    const first = await loader();
    const second = await loader();

    expect(first).toEqual({
      success: true,
      data: {},
    });
    expect(second).toEqual(first);
    expect(collect_viewer_info).toHaveBeenCalledTimes(1);
    expect(collect_viewer_info).toHaveBeenCalledWith({
      senderUrl: "https://api.github.com/users/octo",
      senderOrganizationsUrl: "https://api.github.com/users/octo/orgs",
    });
  });

  it("sends email for send_email actions", async () => {
    const instance = new Repository_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email",
        config: {
          email: "dev@example.com",
          subject: "Subject",
          body: "Body",
        },
      },
      createPayload(),
      jest.fn()
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: "dev@example.com",
      subject: "Subject",
      body: "Body",
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: "The data is added to the queue." },
    });
  });

  it("does not consult viewer data when sending repository emails", async () => {
    const instance = new Repository_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: false,
      message: "viewer failed",
      error: "viewer failed",
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email",
        config: {
          email: "dev@example.com",
          subject: "Subject",
          body: "Body",
        },
      },
      createPayload(),
      getViewerData
    );

    expect(getViewerData).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith({
      email: "dev@example.com",
      subject: "Subject",
      body: "Body",
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: "The data is added to the queue." },
    });
  });

  it("returns success for non-send_email action types", async () => {
    const instance = new Repository_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "unknown_action",
        config: {},
      },
      createPayload(),
      jest.fn()
    );

    expect(result).toEqual({
      success: true,
    });
  });

  it("returns a retryable failure when sendEmail throws", async () => {
    const instance = new Repository_event(createPrismaMock() as any);
    (sendEmail as jest.Mock).mockRejectedValueOnce(new Error("mailer down"));

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email",
        config: {
          email: "dev@example.com",
          subject: "Subject",
          body: "Body",
        },
      },
      createPayload(),
      jest.fn()
    );

    expect(result).toEqual({
      success: false,
      message: "mailer down",
      error: new Error("mailer down"),
      requeue: true,
    });
  });
});
