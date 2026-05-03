import { Issues_event } from "./issues-event";
import { createPayload, createPrismaMock } from "../test-helpers";
import { collect_viewer_email, collect_viewer_info } from "../../actions";

jest.mock("../../../../../utils/rabbitmq", () => ({
  sendEmail: jest.fn(),
}));

jest.mock("../../actions", () => ({
  collect_viewer_info: jest.fn(),
  collect_viewer_email: jest.fn(),
}));

const { sendEmail } = require("../../../../../utils/rabbitmq");

describe("Issues_event", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("runs the workflow pipeline for issues events", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    const instance = new Issues_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest.spyOn(instance, "executeActions").mockResolvedValue({ success: true });

    const result = await instance.Issues_event({
      event: "issues",
      data: createPayload({ action: "opened" }),
    } as any);

    expect(prisma.workflowRun.create).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("returns success when no workflow matches", async () => {
    const prisma = createPrismaMock();
    const instance = new Issues_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue(null);

    await expect(
      instance.Issues_event({
        event: "issues",
        data: createPayload({ action: "opened" }),
      } as any)
    ).resolves.toEqual({ success: true });

    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it("returns success when the workflow has no actions", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([]);
    const instance = new Issues_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });

    await expect(
      instance.Issues_event({
        event: "issues",
        data: createPayload({ action: "opened" }),
      } as any)
    ).resolves.toEqual({ success: true });

    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it("creates and completes a workflow run when actions execute successfully", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    const instance = new Issues_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest.spyOn(instance, "executeActions").mockResolvedValue({ success: true });

    const payload = createPayload({ action: "opened" });
    const result = await instance.Issues_event({
      event: "issues",
      data: payload,
    } as any);

    expect(prisma.workflowRun.create).toHaveBeenCalledWith({
      data: {
        workflowId: "workflow-1",
        platform: "GitHub",
        eventType: "issues",
        payload: JSON.stringify(payload),
        status: "Running",
      },
      select: {
        id: true,
      },
    });
    expect(prisma.workflowRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: {
        status: "Succeeded",
        output: undefined,
        finishedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({ success: true });
  });

  it("marks the workflow run failed when executeActions returns a failure result", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    const instance = new Issues_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest.spyOn(instance, "executeActions").mockResolvedValue({
      success: false,
      message: "Action failed",
      allUpTo: false,
      requeue: false,
    });

    const result = await instance.Issues_event({
      event: "issues",
      data: createPayload({ action: "opened" }),
    } as any);

    expect(prisma.workflowRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: {
        status: "Failed",
        output: JSON.stringify("Action failed"),
        finishedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      success: false,
      message: "Action failed",
      allUpTo: false,
      requeue: false,
    });
  });

  it("marks the workflow run failed and does not requeue when executeActions throws", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    const instance = new Issues_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest.spyOn(instance, "executeActions").mockRejectedValue(new Error("boom"));

    const result = await instance.Issues_event({
      event: "issues",
      data: createPayload({ action: "opened" }),
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
      requeue: false,
    });
  });

  it("loads viewer data once and caches the result", async () => {
    const instance = new Issues_event(createPrismaMock() as any);
    (collect_viewer_info as jest.Mock).mockResolvedValue({
      success: true,
      data: { viewer: 1 },
    });

    const senderUrl = "https://api.github.com/users/octo";
    const senderOrganizationsUrl = "https://api.github.com/users/octo/orgs";

    const loader = (instance as any).createViewerDataLoader(
      createPayload({
        sender: {
          url: senderUrl,
          html_url: "https://github.com/octo",
          organizations_url: senderOrganizationsUrl,
        },
      })
    );

    const first = await loader();
    const second = await loader();

    expect(first).toEqual({
      success: true,
      data: { viewer: 1 },
    });
    expect(second).toEqual(first);
    expect(collect_viewer_info).toHaveBeenCalledTimes(1);
    expect(collect_viewer_info).toHaveBeenCalledWith({
      senderUrl,
      senderOrganizationsUrl,
    });
  });

  it("returns collected viewer data for collect_viewer_data action", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      { type: "collect_viewer_data", config: {} },
      createPayload(),
      jest.fn().mockResolvedValue({
        success: true,
        data: { viewer: 1 },
      })
    );

    expect(result).toEqual({
      success: true,
      output: { viewer: 1 },
    });
  });

  it("returns collect_viewer_data failure when viewer lookup fails", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      { type: "collect_viewer_data", config: {} },
      createPayload(),
      jest.fn().mockResolvedValue({
        success: false,
        message: "viewer failed",
        error: "viewer failed",
      })
    );

    expect(result).toEqual({
      success: false,
      message: "viewer failed",
      error: "viewer failed",
    });
  });

  it("sends email without viewer info when not requested", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

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

  it("sends email with viewer info when requested", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email",
        config: {
          email: "dev@example.com",
          subject: "Subject",
          body: "Body",
          do_you_want_push_info: true,
        },
      },
      createPayload(),
      jest.fn().mockResolvedValue({
        success: true,
        data: { viewer: 1 },
      })
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: "dev@example.com",
      subject: "Subject",
      body: 'Body\n\nViewer info:\n{"viewer":1}',
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: "The data is added to the queue." },
    });
  });

  it("returns send_email failure when viewer info lookup fails", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email",
        config: {
          email: "dev@example.com",
          subject: "Subject",
          body: "Body",
          do_you_want_push_info: true,
        },
      },
      createPayload(),
      jest.fn().mockResolvedValue({
        success: false,
        message: "viewer failed",
        error: "viewer failed",
      })
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: "viewer failed",
      error: "viewer failed",
    });
  });

  it("sends email to me without viewer info when not requested", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email_to_me",
        config: {
          email: "me@example.com",
          subject: "Subject",
          body: "Body",
        },
      },
      createPayload(),
      jest.fn()
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: "me@example.com",
      subject: "Subject",
      body: "Body",
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: "The data is added to the queue." },
    });
  });

  it("sends email to me with viewer info when requested", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email_to_me",
        config: {
          email: "me@example.com",
          subject: "Subject",
          body: "Body",
          do_you_want_push_info: true,
        },
      },
      createPayload(),
      jest.fn().mockResolvedValue({
        success: true,
        data: { viewer: 1 },
      })
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: "me@example.com",
      subject: "Subject",
      body: 'Body\n\nViewer info:\n{"viewer":1}',
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: "The data is added to the queue." },
    });
  });

  it("returns send_email_to_me failure when viewer info lookup fails", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email_to_me",
        config: {
          email: "me@example.com",
          subject: "Subject",
          body: "Body",
          do_you_want_push_info: true,
        },
      },
      createPayload(),
      jest.fn().mockResolvedValue({
        success: false,
        message: "viewer failed",
        error: "viewer failed",
      })
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: "viewer failed",
      error: "viewer failed",
    });
  });

  it("returns failure when collect_viewer_email fails", async () => {
    const instance = new Issues_event(createPrismaMock() as any);
    (collect_viewer_email as jest.Mock).mockResolvedValue({
      success: false,
      message: "email lookup failed",
      error: "email lookup failed",
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

    expect(result).toEqual({
      success: false,
      message: "email lookup failed",
      error: "email lookup failed",
    });
  });

  it("sends email to the trigger owner when the address is resolved", async () => {
    const instance = new Issues_event(createPrismaMock() as any);
    (collect_viewer_email as jest.Mock).mockResolvedValue({
      success: true,
      data: "owner@example.com",
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

    expect(sendEmail).toHaveBeenCalledWith({
      email: "owner@example.com",
      subject: "Subject",
      body: "Body",
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: "The data is added to the queue." },
    });
  });

  it("returns webhook failure when viewer lookup fails", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "webhook",
        config: {
          url: "https://example.com/hook",
        },
      },
      createPayload(),
      jest.fn().mockResolvedValue({
        success: false,
        message: "viewer failed",
        error: "viewer failed",
      })
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: "viewer failed",
      error: "viewer failed",
    });
  });

  it("returns webhook failure when the remote endpoint is not ok", async () => {
    const instance = new Issues_event(createPrismaMock() as any);
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
      jest.fn().mockResolvedValue({
        success: true,
        data: { viewer: 1 },
      })
    );

    expect(result).toEqual({
      success: false,
      message: "Webhook returned 500",
      error: "server error",
      requeue: false,
    });
  });

  it("returns webhook json output when the remote endpoint succeeds with json", async () => {
    const instance = new Issues_event(createPrismaMock() as any);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue("application/json"),
      },
      json: jest.fn().mockResolvedValue({ accepted: true }),
    });

    const payload = createPayload();

    const result = await (instance as any).executeSingleAction(
      {
        type: "webhook",
        config: {
          url: "https://example.com/hook",
        },
      },
      payload,
      jest.fn().mockResolvedValue({
        success: true,
        data: { viewer: 1 },
      })
    );

    expect(global.fetch).toHaveBeenCalledWith("https://example.com/hook", {
      method: "POST",
      headers: {
        "User-Agent": "ShobApp24-webhook",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trigger_payload: payload,
        viewer_info: { viewer: 1 },
      }),
    });
    expect(result).toEqual({
      success: true,
      output: { accepted: true },
    });
  });

  it("returns webhook text output when the remote endpoint succeeds with text", async () => {
    const instance = new Issues_event(createPrismaMock() as any);
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
      jest.fn().mockResolvedValue({
        success: true,
        data: { viewer: 1 },
      })
    );

    expect(result).toEqual({
      success: true,
      output: "ok",
    });
  });

  it("returns a retryable failure when webhook fetch throws", async () => {
    const instance = new Issues_event(createPrismaMock() as any);
    (global.fetch as jest.Mock).mockRejectedValue(new Error("network failed"));

    const result = await (instance as any).executeSingleAction(
      {
        type: "webhook",
        config: {
          url: "https://example.com/hook",
        },
      },
      createPayload(),
      jest.fn().mockResolvedValue({
        success: true,
        data: { viewer: 1 },
      })
    );

    expect(result).toEqual({
      success: false,
      message: "network failed",
      error: new Error("network failed"),
      requeue: true,
    });
  });

  it("returns success for analytics_data_by_AI action", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      { type: "analytics_data_by_AI", config: {} },
      createPayload(),
      jest.fn()
    );

    expect(result).toEqual({
      success: true,
    });
  });

  it("returns success for send_telegram action", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      { type: "send_telegram", config: {} },
      createPayload(),
      jest.fn()
    );

    expect(result).toEqual({
      success: true,
    });
  });

  it("returns success for unsupported actions", async () => {
    const instance = new Issues_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      { type: "unknown_action", config: {} },
      createPayload(),
      jest.fn()
    );

    expect(result).toEqual({
      success: true,
    });
  });

  it("returns a retryable failure when sendEmail throws", async () => {
    const instance = new Issues_event(createPrismaMock() as any);
    sendEmail.mockRejectedValueOnce(new Error("mailer down"));

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
