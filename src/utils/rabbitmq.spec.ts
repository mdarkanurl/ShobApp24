jest.mock("amqplib", () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
  },
}));

jest.mock("@nestjs/config", () => ({
  ConfigService: jest.fn(),
}));

jest.mock("../worker/send-email/send-email", () => ({
  startEmailConsumer: jest.fn(),
}));

jest.mock("../worker/github/rabbitmq-consumer", () => ({
  githubWebhookConsumer: jest.fn(),
}));

describe("rabbitmq utils", () => {
  let connectMock: jest.Mock;
  let configGetMock: jest.Mock;
  let startEmailConsumerMock: jest.Mock;
  let githubWebhookConsumerMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    connectMock = require("amqplib").default.connect;
    connectMock.mockReset();

    const { ConfigService } = require("@nestjs/config");
    configGetMock = jest.fn();
    (ConfigService as jest.Mock).mockReset();
    (ConfigService as jest.Mock).mockImplementation(() => ({
      get: configGetMock,
    }));

    startEmailConsumerMock =
      require("../worker/send-email/send-email").startEmailConsumer;
    startEmailConsumerMock.mockReset();

    githubWebhookConsumerMock =
      require("../worker/github/rabbitmq-consumer").githubWebhookConsumer;
    githubWebhookConsumerMock.mockReset();
  });

  describe("rabbitmq", () => {
    it("connects using the configured url, sets up queues, and starts consumers", async () => {
      configGetMock.mockReturnValue("amqp://remote-host");

      const emailChannel = {
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest.fn().mockResolvedValue(undefined),
        bindQueue: jest.fn().mockResolvedValue(undefined),
        sendToQueue: jest.fn(),
      };
      const githubChannel = {
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest.fn().mockResolvedValue(undefined),
        bindQueue: jest.fn().mockResolvedValue(undefined),
        sendToQueue: jest.fn(),
      };
      const onMock = jest.fn();
      const connection = {
        createChannel: jest
          .fn()
          .mockResolvedValueOnce(emailChannel)
          .mockResolvedValueOnce(githubChannel),
        on: onMock,
      };
      connectMock.mockResolvedValue(connection);

      const rabbitmqModule = require("./rabbitmq");

      await rabbitmqModule.rabbitmq();

      expect(connectMock).toHaveBeenCalledWith("amqp://remote-host");
      expect(connection.createChannel).toHaveBeenCalledTimes(2);
      expect(onMock).toHaveBeenCalledWith("close", expect.any(Function));
      expect(onMock).toHaveBeenCalledWith("error", expect.any(Function));
      expect(emailChannel.assertExchange).toHaveBeenCalledWith(
        "sendEmail.dlx",
        "direct",
        {
          durable: true,
        }
      );
      expect(emailChannel.assertQueue).toHaveBeenCalledWith("sendEmail", {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": "sendEmail.dlx",
          "x-dead-letter-routing-key": "dlq",
        },
      });
      expect(githubChannel.assertQueue).toHaveBeenCalledWith(
        "sendGitHubWebhookData",
        {
          durable: true,
          arguments: {
            "x-dead-letter-exchange": "sendGitHubWebhookData.dlx",
            "x-dead-letter-routing-key": "dlq",
          },
        }
      );
      expect(startEmailConsumerMock).toHaveBeenCalledWith(emailChannel);
      expect(githubWebhookConsumerMock).toHaveBeenCalledWith(githubChannel);
      expect(rabbitmqModule.rabbitMqConnectedAt).toBeInstanceOf(Date);
    });

    it("uses the localhost default when config does not provide a url", async () => {
      configGetMock.mockReturnValue(undefined);
      const connection = {
        createChannel: jest
          .fn()
          .mockResolvedValue({
            assertExchange: jest.fn().mockResolvedValue(undefined),
            assertQueue: jest.fn().mockResolvedValue(undefined),
            bindQueue: jest.fn().mockResolvedValue(undefined),
            sendToQueue: jest.fn(),
          }),
        on: jest.fn(),
      };
      connectMock.mockResolvedValue(connection);

      const rabbitmqModule = require("./rabbitmq");

      await rabbitmqModule.rabbitmq();

      expect(connectMock).toHaveBeenCalledWith("amqp://localhost");
    });
  });

  describe("sendEmail", () => {
    it("throws when the email channel is not initialized", async () => {
      const rabbitmqModule = require("./rabbitmq");

      await expect(
        rabbitmqModule.sendEmail({
          email: "dev@example.com",
          subject: "Test",
          body: "Hello",
        })
      ).rejects.toThrow("Email channel not initialized");
    });

    it("sends the serialized payload to the email queue after initialization", async () => {
      configGetMock.mockReturnValue("amqp://localhost");
      const emailChannel = {
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest.fn().mockResolvedValue(undefined),
        bindQueue: jest.fn().mockResolvedValue(undefined),
        sendToQueue: jest.fn(),
      };
      const githubChannel = {
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest.fn().mockResolvedValue(undefined),
        bindQueue: jest.fn().mockResolvedValue(undefined),
        sendToQueue: jest.fn(),
      };
      connectMock.mockResolvedValue({
        createChannel: jest
          .fn()
          .mockResolvedValueOnce(emailChannel)
          .mockResolvedValueOnce(githubChannel),
        on: jest.fn(),
      });

      const rabbitmqModule = require("./rabbitmq");
      const data = {
        email: "dev@example.com",
        subject: "Test",
        body: "Hello",
      };

      await rabbitmqModule.rabbitmq();
      await rabbitmqModule.sendEmail(data);

      expect(emailChannel.sendToQueue).toHaveBeenCalledWith(
        "sendEmail",
        Buffer.from(JSON.stringify(data), "utf-8"),
        { persistent: true }
      );
    });
  });

  describe("sendGitHubWebhookData", () => {
    it("throws when the github channel is not initialized", async () => {
      const rabbitmqModule = require("./rabbitmq");

      await expect(
        rabbitmqModule.sendGitHubWebhookData({
          event: "push",
        })
      ).rejects.toThrow("GitHub channel not initialized");
    });

    it("sends the serialized payload to the github webhook queue after initialization", async () => {
      configGetMock.mockReturnValue("amqp://localhost");
      const emailChannel = {
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest.fn().mockResolvedValue(undefined),
        bindQueue: jest.fn().mockResolvedValue(undefined),
        sendToQueue: jest.fn(),
      };
      const githubChannel = {
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest.fn().mockResolvedValue(undefined),
        bindQueue: jest.fn().mockResolvedValue(undefined),
        sendToQueue: jest.fn(),
      };
      connectMock.mockResolvedValue({
        createChannel: jest
          .fn()
          .mockResolvedValueOnce(emailChannel)
          .mockResolvedValueOnce(githubChannel),
        on: jest.fn(),
      });

      const rabbitmqModule = require("./rabbitmq");
      const data = {
        event: "push",
        data: {
          repository: {
            id: 1,
          },
        },
      };

      await rabbitmqModule.rabbitmq();
      await rabbitmqModule.sendGitHubWebhookData(data);

      expect(githubChannel.sendToQueue).toHaveBeenCalledWith(
        "sendGitHubWebhookData",
        Buffer.from(JSON.stringify(data), "utf-8"),
        { persistent: true }
      );
    });
  });
});
