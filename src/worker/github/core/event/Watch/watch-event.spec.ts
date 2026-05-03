import { Watch_event } from "./watch-event";
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

describe("Watch_event", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  it("runs the workflow pipeline for watch events", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    const instance = new Watch_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest.spyOn(instance, "executeActions").mockResolvedValue({ success: true });

    const result = await instance.Watch_event({
      event: "watch",
      data: createPayload({ action: "started" }),
    } as any);

    expect(prisma.workflowRun.create).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("returns success when no workflow matches", async () => {
    const prisma = createPrismaMock();
    const instance = new Watch_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue(null);

    await expect(instance.Watch_event({ event: "watch", data: createPayload({ action: "started" }) } as any))
      .resolves.toEqual({ success: true });
    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it("returns success when the workflow has no actions", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([]);
    const instance = new Watch_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });

    await expect(instance.Watch_event({ event: "watch", data: createPayload({ action: "started" }) } as any))
      .resolves.toEqual({ success: true });
    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it("marks the workflow run failed when executeActions throws", async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: "action-1", step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
    prisma.workflowRun.update.mockResolvedValue(undefined);
    const instance = new Watch_event(prisma as any);
    jest.spyOn(instance, "findWorkflow").mockResolvedValue({ id: "workflow-1" });
    jest.spyOn(instance, "executeActions").mockRejectedValue(new Error("boom"));

    const result = await instance.Watch_event({ event: "watch", data: createPayload({ action: "started" }) } as any);

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
    const instance = new Watch_event(createPrismaMock() as any);
    (collect_viewer_info as jest.Mock).mockResolvedValue({ success: true, data: {} });

    const loader = (instance as any).createViewerDataLoader(createPayload());
    const first = await loader();
    const second = await loader();

    expect(first).toEqual({ success: true, data: {} });
    expect(second).toEqual(first);
    expect(collect_viewer_info).toHaveBeenCalledTimes(1);
    expect(collect_viewer_info).toHaveBeenCalledWith({
      senderUrl: "https://api.github.com/users/octo",
      senderOrganizationsUrl: "https://api.github.com/users/octo/orgs",
    });
  });

  it("returns collect_viewer_data output when viewer data loads successfully", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    const result = await (instance as any).executeSingleAction(
      { type: "collect_viewer_data", config: {} },
      createPayload(),
      jest.fn().mockResolvedValue({ success: true, data: { viewer: 1 } })
    );
    expect(result).toEqual({ success: true, output: { viewer: 1 } });
  });

  it("returns collect_viewer_data failure when viewer lookup fails", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    const result = await (instance as any).executeSingleAction(
      { type: "collect_viewer_data", config: {} },
      createPayload(),
      jest.fn().mockResolvedValue({ success: false, message: "viewer failed", error: "viewer failed" })
    );
    expect(result).toEqual({ success: false, message: "viewer failed", error: "viewer failed" });
  });

  it("sends email without viewer info when send_email does not request it", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    const result = await (instance as any).executeSingleAction(
      { type: "send_email", config: { email: "dev@example.com", subject: "Subject", body: "Body" } },
      createPayload(),
      jest.fn()
    );
    expect(sendEmail).toHaveBeenCalledWith({ email: "dev@example.com", subject: "Subject", body: "Body" });
    expect(result).toEqual({ success: true, output: { custom_message: "The data is added to the queue." } });
  });

  it("sends email with viewer info when send_email requests it", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    const result = await (instance as any).executeSingleAction(
      { type: "send_email", config: { email: "dev@example.com", subject: "Subject", body: "Body", do_you_want_viewer_info: true } },
      createPayload(),
      jest.fn().mockResolvedValue({ success: true, data: { viewer: 1 } })
    );
    expect(sendEmail).toHaveBeenCalledWith({
      email: "dev@example.com",
      subject: "Subject",
      body: expect.stringContaining('Viewer info:\n{"viewer":1}'),
    });
    expect(result).toEqual({ success: true, output: { custom_message: "The data is added to the queue." } });
  });

  it("returns send_email failure when viewer info is requested and lookup fails", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    const result = await (instance as any).executeSingleAction(
      { type: "send_email", config: { email: "dev@example.com", subject: "Subject", body: "Body", do_you_want_viewer_info: true } },
      createPayload(),
      jest.fn().mockResolvedValue({ success: false, message: "viewer failed", error: "viewer failed" })
    );
    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, message: "viewer failed", error: "viewer failed" });
  });

  it("sends email to me without viewer info when not requested", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    const result = await (instance as any).executeSingleAction(
      { type: "send_email_to_me", config: { email: "me@example.com", subject: "Subject", body: "Body" } },
      createPayload(),
      jest.fn()
    );
    expect(sendEmail).toHaveBeenCalledWith({ email: "me@example.com", subject: "Subject", body: "Body" });
    expect(result).toEqual({ success: true, output: { custom_message: "The data is added to the queue." } });
  });

  it("sends email to me with viewer info when requested", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    const result = await (instance as any).executeSingleAction(
      { type: "send_email_to_me", config: { email: "me@example.com", subject: "Subject", body: "Body", do_you_want_viewer_info: true } },
      createPayload(),
      jest.fn().mockResolvedValue({ success: true, data: { viewer: 1 } })
    );
    expect(sendEmail).toHaveBeenCalledWith({
      email: "me@example.com",
      subject: "Subject",
      body: expect.stringContaining('Viewer info:\n{"viewer":1}'),
    });
    expect(result).toEqual({ success: true, output: { custom_message: "The data is added to the queue." } });
  });

  it("returns send_email_to_me failure when viewer info lookup fails", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    const result = await (instance as any).executeSingleAction(
      { type: "send_email_to_me", config: { email: "me@example.com", subject: "Subject", body: "Body", do_you_want_viewer_info: true } },
      createPayload(),
      jest.fn().mockResolvedValue({ success: false, message: "viewer failed", error: "viewer failed" })
    );
    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, message: "viewer failed", error: "viewer failed" });
  });

  it("returns failure when collect_viewer_email fails", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    (collect_viewer_email as jest.Mock).mockResolvedValue({ success: false, message: "email lookup failed", error: "email lookup failed" });
    const result = await (instance as any).executeSingleAction(
      { type: "send_email_to_who_send_the_trigger", config: { subject: "Subject", body: "Body" } },
      createPayload(),
      jest.fn()
    );
    expect(result).toEqual({ success: false, message: "email lookup failed", error: "email lookup failed" });
  });

  it("sends email to the trigger owner when the address is resolved", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    (collect_viewer_email as jest.Mock).mockResolvedValue({ success: true, data: "owner@example.com" });
    const result = await (instance as any).executeSingleAction(
      { type: "send_email_to_who_send_the_trigger", config: { subject: "Subject", body: "Body" } },
      createPayload(),
      jest.fn()
    );
    expect(sendEmail).toHaveBeenCalledWith({ email: "owner@example.com", subject: "Subject", body: "Body" });
    expect(result).toEqual({ success: true, output: { custom_message: "The data is added to the queue." } });
  });

  it("returns webhook failure when viewer lookup fails", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    const result = await (instance as any).executeSingleAction(
      { type: "webhook", config: { url: "https://example.com/hook" } },
      createPayload(),
      jest.fn().mockResolvedValue({ success: false, message: "viewer failed", error: "viewer failed" })
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, message: "viewer failed", error: "viewer failed" });
  });

  it("returns webhook failure when the remote endpoint is not ok", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: jest.fn().mockResolvedValue("server error") });
    const result = await (instance as any).executeSingleAction(
      { type: "webhook", config: { url: "https://example.com/hook" } },
      createPayload(),
      jest.fn().mockResolvedValue({ success: true, data: { viewer: 1 } })
    );
    expect(result).toEqual({ success: false, message: "Webhook returned 500", error: "server error", requeue: false });
  });

  it("returns webhook json output when the remote endpoint succeeds with json", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: jest.fn().mockReturnValue("application/json") },
      json: jest.fn().mockResolvedValue({ accepted: true }),
    });
    const result = await (instance as any).executeSingleAction(
      { type: "webhook", config: { url: "https://example.com/hook" } },
      createPayload(),
      jest.fn().mockResolvedValue({ success: true, data: { viewer: 1 } })
    );
    expect(result).toEqual({ success: true, output: { accepted: true } });
  });

  it("returns webhook text output when the remote endpoint succeeds with text", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: jest.fn().mockReturnValue("text/plain") },
      text: jest.fn().mockResolvedValue("ok"),
    });
    const result = await (instance as any).executeSingleAction(
      { type: "webhook", config: { url: "https://example.com/hook" } },
      createPayload(),
      jest.fn().mockResolvedValue({ success: true, data: { viewer: 1 } })
    );
    expect(result).toEqual({ success: true, output: "ok" });
  });

  it("returns success for send_telegram", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    const result = await (instance as any).executeSingleAction(
      { type: "send_telegram", config: {} },
      createPayload(),
      jest.fn()
    );
    expect(result).toEqual({ success: true });
  });

  it("returns success for unsupported actions", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    const result = await (instance as any).executeSingleAction(
      { type: "unknown_action", config: {} },
      createPayload(),
      jest.fn()
    );
    expect(result).toEqual({ success: true });
  });

  it("returns a retryable failure when sendEmail throws", async () => {
    const instance = new Watch_event(createPrismaMock() as any);
    (sendEmail as jest.Mock).mockRejectedValueOnce(new Error("mailer down"));
    const result = await (instance as any).executeSingleAction(
      { type: "send_email", config: { email: "dev@example.com", subject: "Subject", body: "Body" } },
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
