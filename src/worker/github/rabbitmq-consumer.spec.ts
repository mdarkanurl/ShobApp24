const mockMain = jest.fn();

jest.mock("../../utils/rabbitmq", () => ({
  sendGitHubWebhookDataQueue: "sendGitHubWebhookData",
}));

jest.mock("./main", () => ({
  main: mockMain,
}));

describe("githubWebhookConsumer", () => {
  let githubWebhookConsumer: typeof import("./rabbitmq-consumer").githubWebhookConsumer;

  let channelMock: {
    consume: jest.Mock;
    ack: jest.Mock;
    nack: jest.Mock;
  };
  
  let consumeHandler: ((msg: any) => Promise<void>) | undefined;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const loadModule = () => {
    ({ githubWebhookConsumer } = require("./rabbitmq-consumer"));
  };

  beforeEach(() => {
    jest.resetModules();
    mockMain.mockReset();

    channelMock = {
      consume: jest.fn((_queue, handler) => {
        consumeHandler = handler;
      }),
      ack: jest.fn(),
      nack: jest.fn(),
    };

    consumeHandler = undefined;
    consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("registers the consumer on the github webhook queue", async () => {
    loadModule();

    await githubWebhookConsumer(channelMock as any);

    expect(channelMock.consume).toHaveBeenCalledWith(
      "sendGitHubWebhookData",
      expect.any(Function),
      {
        noAck: false,
      }
    );
  });

  it("logs and exits when RabbitMQ cancels the consumer", async () => {
    loadModule();
    await githubWebhookConsumer(channelMock as any);

    await consumeHandler?.(null);

    expect(consoleWarnSpy).toHaveBeenCalledWith("Consumer cancelled by server");
    expect(channelMock.ack).not.toHaveBeenCalled();
    expect(channelMock.nack).not.toHaveBeenCalled();
  });

  it("dead-letters invalid JSON payloads", async () => {
    loadModule();
    await githubWebhookConsumer(channelMock as any);
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

  it("dead-letters null payloads returned from JSON.parse", async () => {
    loadModule();
    await githubWebhookConsumer(channelMock as any);
    const msg = {
      content: Buffer.from("null", "utf-8"),
    };

    await consumeHandler?.(msg);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid payload:", null);
    expect(channelMock.nack).toHaveBeenCalledWith(msg, false, false);
    expect(mockMain).not.toHaveBeenCalled();
  });

  it("passes the parsed payload to main and acks on success", async () => {
    loadModule();
    await githubWebhookConsumer(channelMock as any);
    const payload = {
      event: "push",
      data: {
        repository: {
          id: 1,
        },
      },
    };
    const msg = {
      content: Buffer.from(JSON.stringify(payload), "utf-8"),
    };
    mockMain.mockResolvedValue({
      success: true,
      allUpTo: false,
      requeue: false,
    });

    await consumeHandler?.(msg);

    expect(mockMain).toHaveBeenCalledWith(payload);
    expect(channelMock.ack).toHaveBeenCalledWith(msg);
    expect(channelMock.nack).not.toHaveBeenCalled();
  });

  it("nacks using the result returned by main when business logic fails", async () => {
    loadModule();
    await githubWebhookConsumer(channelMock as any);
    const payload = {
      event: "push",
      data: {
        repository: {
          id: 1,
        },
      },
    };
    const msg = {
      content: Buffer.from(JSON.stringify(payload), "utf-8"),
    };
    mockMain.mockResolvedValue({
      success: false,
      allUpTo: true,
      requeue: false,
    });

    await consumeHandler?.(msg);

    expect(channelMock.nack).toHaveBeenCalledWith(msg, true, false);
    expect(channelMock.ack).not.toHaveBeenCalled();
  });

  it("requeues the message when main throws unexpectedly", async () => {
    loadModule();
    await githubWebhookConsumer(channelMock as any);
    const payload = {
      event: "push",
      data: {
        repository: {
          id: 1,
        },
      },
    };
    const msg = {
      content: Buffer.from(JSON.stringify(payload), "utf-8"),
    };
    const error = new Error("worker crashed");
    mockMain.mockRejectedValue(error);

    await consumeHandler?.(msg);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Unexpected error in github worker:",
      error
    );
    expect(channelMock.nack).toHaveBeenCalledWith(msg, false, true);
  });
});
