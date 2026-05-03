import { Workflow_run_event } from "./workflow_run-event";
import { createPayload, createPrismaMock } from "../test-helpers";
import { collect_viewer_email, collect_viewer_info } from "../../actions";
import { sendEmail } from "../../../../../utils/rabbitmq";

jest.mock("../../../../../utils/rabbitmq", () => ({
  sendEmail: jest.fn(),
}));

jest.mock("../../actions", () => ({
  collect_viewer_info: jest.fn(),
  collect_viewer_email: jest.fn(),
}));

describe("Workflow_run_event", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("returns success when installation data is missing", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);

    await expect(
      instance.Workflow_run_event({
        event: "workflow_run",
        data: createPayload({ installation: undefined }),
      } as any)
    ).resolves.toEqual({ success: true });
  });

  it("returns success when workflow is not found", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue(null);

    await expect(
      instance.Workflow_run_event({
        event: "workflow_run",
        data: createPayload(),
      } as any)
    ).resolves.toEqual({ success: true });
  });

  it("returns success when workflow has no actions", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([]);
    const instance = new Workflow_run_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });

    await expect(
      instance.Workflow_run_event({
        event: "workflow_run",
        data: createPayload(),
      } as any)
    ).resolves.toEqual({ success: true });

    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it("creates and completes a workflow run when actions succeed", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    const instance = new Workflow_run_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest.spyOn(instance, "executeActions").mockResolvedValue({ success: true });

    await expect(
      instance.Workflow_run_event({
        event: "workflow_run",
        data: createPayload(),
      } as any)
    ).resolves.toEqual({ success: true });

    expect(prisma.workflowRun.create).toHaveBeenCalledWith({
      data: {
        workflowId: "workflow-1",
        platform: "GitHub",
        eventType: "workflow_run",
        payload: JSON.stringify(createPayload()),
        status: "Running",
      },
      select: {
        id: true,
      },
    });
    expect(prisma.workflowRun.update).toHaveBeenCalledWith({
      where: {
        id: "run-1",
      },
      data: expect.objectContaining({
        status: "Succeeded",
      }),
    });
  });

  it("marks the workflow run as failed when action execution fails", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    const instance = new Workflow_run_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest.spyOn(instance, "executeActions").mockResolvedValue({
      success: false,
      message: "Action failed",
      allUpTo: false,
      requeue: false,
    });

    await expect(
      instance.Workflow_run_event({
        event: "workflow_run",
        data: createPayload(),
      } as any)
    ).resolves.toEqual({
      success: false,
      message: "Action failed",
      allUpTo: false,
      requeue: false,
    });

    expect(prisma.workflowRun.update).toHaveBeenCalledWith({
      where: {
        id: "run-1",
      },
      data: expect.objectContaining({
        status: "Failed",
        output: JSON.stringify("Action failed"),
      }),
    });
  });

  it("updates the workflow run and requeues when an unexpected error is thrown after run creation", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    const instance = new Workflow_run_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest
      .spyOn(instance, "executeActions")
      .mockRejectedValue(new Error("Unexpected failure"));

    await expect(
      instance.Workflow_run_event({
        event: "workflow_run",
        data: createPayload(),
      } as any)
    ).resolves.toEqual({
      success: false,
      message: "Unexpected failure",
      allUpTo: false,
      requeue: true,
    });

    expect(prisma.workflowRun.update).toHaveBeenCalledWith({
      where: {
        id: "run-1",
      },
      data: expect.objectContaining({
        status: "Failed",
        output: JSON.stringify(new Error("Unexpected failure")),
      }),
    });
  });

  it("returns a non-requeueable failure when sender html url is missing", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email_to_who_send_the_trigger",
        config: {
          subject: "Subject",
          body: "Body",
        },
      },
      createPayload({
        sender: {
          url: "https://api.github.com/users/octo",
          html_url: "",
          organizations_url: "https://api.github.com/users/octo/orgs",
        },
      }),
      jest.fn()
    );

    expect(result).toEqual({
      success: false,
      message: "Missing sender.html_url in workflow_run payload",
      requeue: false,
    });
  });

  it("returns viewer-data failure when sender url is missing", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const loader = (instance as any).createViewerDataLoader(
      createPayload({
        sender: {
          url: "",
          html_url: "https://github.com/octo",
          organizations_url: "https://api.github.com/users/octo/orgs",
        },
      })
    );

    const first = await loader();
    const second = await loader();

    expect(first).toEqual({
      success: false,
      message: "Missing sender.url in workflow_run payload",
      error: "missing_sender_url",
    });
    expect(second).toEqual(first);
    expect(collect_viewer_info).not.toHaveBeenCalled();
  });

  it("loads viewer-data once and caches the result", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    (collect_viewer_info as jest.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    const url = "https://api.github.com/users/octo";
    const organizationsUrl = "https://api.github.com/users/octo/orgs";

    const loader = (instance as any).createViewerDataLoader(
      createPayload({
        sender: {
          url,
          html_url: "https://github.com/octo",
          organizations_url: organizationsUrl,
        },
      })
    );

    const first = await loader();
    const second = await loader();

    expect(first).toEqual({
      success: true,
      data: {},
    });
    expect(second).toEqual(first);
    expect(collect_viewer_info).toHaveBeenCalledTimes(1);
    expect(collect_viewer_info).toHaveBeenCalledWith({
      senderUrl: url,
      senderOrganizationsUrl: organizationsUrl,
    });
  });

  it("returns collected viewer data for collect_viewer_data action", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: true,
      data: { login: "octo" },
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "collect_viewer_data",
        config: undefined,
      },
      createPayload(),
      getViewerData
    );

    expect(result).toEqual({
      success: true,
      output: { login: "octo" },
    });
  });

  it("returns viewer-data errors for collect_viewer_data action", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: false,
      message: "viewer failed",
      error: "viewer_error",
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "collect_viewer_data",
        config: undefined,
      },
      createPayload(),
      getViewerData
    );

    expect(result).toEqual({
      success: false,
      message: "viewer failed",
      error: "viewer_error",
    });
  });

  it("sends a plain email without viewer info", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);

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

  it("sends an email with viewer info when requested", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: true,
      data: { login: "octo" },
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email",
        config: {
          email: "dev@example.com",
          subject: "Subject",
          body: "Body",
          do_you_want_viewer_info: true,
        },
      },
      createPayload(),
      getViewerData
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: "dev@example.com",
      subject: "Subject",
      body: 'Body\n\nViewer info:\n{"login":"octo"}',
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: "The data is added to the queue." },
    });
  });

  it("returns viewer-data errors for send_email when viewer info is requested", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: false,
      message: "viewer failed",
      error: "viewer_error",
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email",
        config: {
          email: "dev@example.com",
          subject: "Subject",
          body: "Body",
          do_you_want_viewer_info: true,
        },
      },
      createPayload(),
      getViewerData
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: "viewer failed",
      error: "viewer_error",
    });
  });

  it("sends an email to me with viewer info when requested", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: true,
      data: { login: "octo" },
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email_to_me",
        config: {
          email: "me@example.com",
          subject: "Subject",
          body: "Body",
          do_you_want_viewer_info: true,
        },
      },
      createPayload(),
      getViewerData
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: "me@example.com",
      subject: "Subject",
      body: 'Body\n\nViewer info:\n{"login":"octo"}',
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: "The data is added to the queue." },
    });
  });

  it("returns viewer-data errors for send_email_to_me when viewer info is requested", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: false,
      message: "viewer failed",
      error: "viewer_error",
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email_to_me",
        config: {
          email: "me@example.com",
          subject: "Subject",
          body: "Body",
          do_you_want_viewer_info: true,
        },
      },
      createPayload(),
      getViewerData
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: "viewer failed",
      error: "viewer_error",
    });
  });

  it("sends an email to the trigger sender when email collection succeeds", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    (collect_viewer_email as jest.Mock).mockResolvedValue({
      success: true,
      data: "octo@example.com",
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email_to_who_send_the_trigger",
        config: {
          subject: "Subject",
          body: "Body",
        },
      },
      createPayload(),
      jest.fn()
    );

    expect(collect_viewer_email).toHaveBeenCalledWith("https://github.com/octo");
    expect(sendEmail).toHaveBeenCalledWith({
      email: "octo@example.com",
      subject: "Subject",
      body: "Body",
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: "The data is added to the queue." },
    });
  });

  it("returns email-collection errors for send_email_to_who_send_the_trigger", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    (collect_viewer_email as jest.Mock).mockResolvedValue({
      success: false,
      message: "email lookup failed",
      error: "lookup_error",
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email_to_who_send_the_trigger",
        config: {
          subject: "Subject",
          body: "Body",
        },
      },
      createPayload(),
      jest.fn()
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: "email lookup failed",
      error: "lookup_error",
    });
  });

  it("returns viewer-data errors for webhook action", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: false,
      message: "viewer failed",
      error: "viewer_error",
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "webhook",
        config: {
          url: "https://example.com/hook",
        },
      },
      createPayload(),
      getViewerData
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: "viewer failed",
      error: "viewer_error",
    });
  });

  it("returns non-requeueable failure when webhook responds with a non-ok status", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: true,
      data: { login: "octo" },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue("server error"),
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "webhook",
        config: {
          url: "https://example.com/hook",
        },
      },
      createPayload(),
      getViewerData
    );

    expect(result).toEqual({
      success: false,
      message: "Webhook returned 500",
      error: "server error",
      requeue: false,
    });
  });

  it("returns parsed JSON when webhook responds with JSON", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: true,
      data: { login: "octo" },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue("application/json; charset=utf-8"),
      },
      json: jest.fn().mockResolvedValue({ ok: true }),
      text: jest.fn(),
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "webhook",
        config: {
          url: "https://example.com/hook",
        },
      },
      createPayload(),
      getViewerData
    );

    expect(global.fetch).toHaveBeenCalledWith("https://example.com/hook", {
      method: "POST",
      headers: {
        "User-Agent": "ShobApp24-webhook",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ login: "octo" }),
    });
    expect(result).toEqual({
      success: true,
      output: { ok: true },
    });
  });

  it("returns plain text when webhook responds with text", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: true,
      data: { login: "octo" },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue("text/plain"),
      },
      text: jest.fn().mockResolvedValue("ok"),
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: "webhook",
        config: {
          url: "https://example.com/hook",
        },
      },
      createPayload(),
      getViewerData
    );

    expect(result).toEqual({
      success: true,
      output: "ok",
    });
  });

  it("requeues when webhook throws unexpectedly", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const getViewerData = jest.fn().mockResolvedValue({
      success: true,
      data: { login: "octo" },
    });
    (global.fetch as jest.Mock).mockRejectedValue(new Error("network failed"));

    const result = await (instance as any).executeSingleAction(
      {
        type: "webhook",
        config: {
          url: "https://example.com/hook",
        },
      },
      createPayload(),
      getViewerData
    );

    expect(result).toEqual({
      success: false,
      message: "network failed",
      error: new Error("network failed"),
      requeue: true,
    });
  });

  it("returns a non-requeueable failure for send_telegram action", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_telegram",
        config: {
          message: "hello",
        },
      },
      createPayload(),
      jest.fn()
    );

    expect(result).toEqual({
      success: false,
      message: "send_telegram action is not implemented yet",
      requeue: false,
    });
  });

  it("returns a non-requeueable failure for unsupported action types", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "unsupported_action",
      },
      createPayload(),
      jest.fn()
    );

    expect(result).toEqual({
      success: false,
      message: "Unsupported action type: unsupported_action",
      requeue: false,
    });
  });

  it("requeues when sendEmail throws unexpectedly", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    (sendEmail as jest.Mock).mockRejectedValue(new Error("queue down"));

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
      message: "queue down",
      error: new Error("queue down"),
      requeue: true,
    });
  });
});
