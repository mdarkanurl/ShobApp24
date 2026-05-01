const mockSend = jest.fn();
const mockGet = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

jest.mock("@nestjs/config", () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: mockGet,
  })),
}));

jest.mock("../../utils/rabbitmq", () => ({
  sendEmailQueue: "sendEmail",
}));

describe("startEmailConsumer", () => {
  let startEmailConsumer: typeof import("./send-email").startEmailConsumer;
  let channelMock: {
    consume: jest.Mock;
    ack: jest.Mock;
    nack: jest.Mock;
  };
  let consumeHandler: ((msg: any) => Promise<void>) | undefined;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const loadModule = () => {
    ({ startEmailConsumer } = require("./send-email"));
  };

  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    mockGet.mockReset();
    mockGet.mockReturnValue("resend-api-key");

    channelMock = {
      consume: jest.fn((_queue, handler) => {
        consumeHandler = handler;
      }),
      ack: jest.fn(),
      nack: jest.fn(),
    };

    consumeHandler = undefined;
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("throws during module load when RESEND_API_KEY is missing", () => {
    mockGet.mockReturnValue(undefined);

    expect(() => loadModule()).toThrow("RESEND_API_KEY is not defined");
  });

  it("registers the consumer on the send email queue", async () => {
    loadModule();

    await startEmailConsumer(channelMock as any);

    expect(channelMock.consume).toHaveBeenCalledWith(
      "sendEmail",
      expect.any(Function),
      {
        noAck: false,
      }
    );
  });

  it("logs and exits when RabbitMQ cancels the consumer", async () => {
    loadModule();
    await startEmailConsumer(channelMock as any);

    await consumeHandler?.(null);

    expect(consoleLogSpy).toHaveBeenCalledWith("Consumer cancelled by server");
    expect(channelMock.ack).not.toHaveBeenCalled();
    expect(channelMock.nack).not.toHaveBeenCalled();
  });

  it("dead-letters invalid JSON payloads", async () => {
    loadModule();
    await startEmailConsumer(channelMock as any);
    const msg = {
      content: Buffer.from("not-json", "utf-8"),
    };

    await consumeHandler?.(msg);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Invalid JSON in queue message:",
      "not-json"
    );
    expect(channelMock.nack).toHaveBeenCalledWith(msg, false, false);
    expect(channelMock.ack).not.toHaveBeenCalled();
  });

  it("dead-letters payloads with missing required fields", async () => {
    loadModule();
    await startEmailConsumer(channelMock as any);
    const msg = {
      content: Buffer.from(
        JSON.stringify({
          email: "dev@example.com",
          subject: "",
          body: "Hello",
        }),
        "utf-8"
      ),
    };

    await consumeHandler?.(msg);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid email payload:", {
      email: "dev@example.com",
      subject: "",
      body: "Hello",
    });
    expect(channelMock.nack).toHaveBeenCalledWith(msg, false, false);
  });

  it("requeues the message when Resend returns an API error", async () => {
    loadModule();
    await startEmailConsumer(channelMock as any);
    const msg = {
      content: Buffer.from(
        JSON.stringify({
          email: "dev@example.com",
          subject: "Subject",
          body: "<p>Hello</p>",
        }),
        "utf-8"
      ),
    };
    mockSend.mockResolvedValue({
      data: null,
      error: {
        message: "upstream error",
      },
    });

    await consumeHandler?.(msg);

    expect(mockSend).toHaveBeenCalledWith({
      from: "ShobApp24 <shopapp24@drakilo.com>",
      to: ["dev@example.com"],
      subject: "Subject",
      html: "<p>Hello</p>",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Resend API error:", {
      message: "upstream error",
    });
    expect(channelMock.nack).toHaveBeenCalledWith(msg, false, true);
    expect(channelMock.ack).not.toHaveBeenCalled();
  });

  it("acks the message after a successful send", async () => {
    loadModule();
    await startEmailConsumer(channelMock as any);
    const msg = {
      content: Buffer.from(
        JSON.stringify({
          email: "dev@example.com",
          subject: "Subject",
          body: "<p>Hello</p>",
        }),
        "utf-8"
      ),
    };
    mockSend.mockResolvedValue({
      data: {
        id: "email-123",
      },
      error: null,
    });

    await consumeHandler?.(msg);

    expect(consoleLogSpy).toHaveBeenCalledWith("Email sent successfully:", {
      email: "dev@example.com",
      id: "email-123",
    });
    expect(channelMock.ack).toHaveBeenCalledWith(msg);
    expect(channelMock.nack).not.toHaveBeenCalled();
  });

  it("requeues the message when an unexpected error is thrown", async () => {
    loadModule();
    await startEmailConsumer(channelMock as any);
    const msg = {
      content: Buffer.from(
        JSON.stringify({
          email: "dev@example.com",
          subject: "Subject",
          body: "<p>Hello</p>",
        }),
        "utf-8"
      ),
    };
    const error = new Error("network down");
    mockSend.mockRejectedValue(error);

    await consumeHandler?.(msg);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Unexpected error in email worker:",
      error
    );
    expect(channelMock.nack).toHaveBeenCalledWith(msg, false, true);
  });
});
