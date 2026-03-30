import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { ModulesContainer } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { getRedisConnectedAt, redis } from "../redis";
import { conn, rabbitMqConnectedAt } from "../utils/rabbitmq";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modulesContainer: ModulesContainer,
  ) {}

  getLiveness() {
    const uptimeSeconds = Math.round(process.uptime());
    return {
      status: "ok",
      checkedAt: new Date().toISOString(),
      uptime: this.formatUptime(uptimeSeconds),
      service: "up",
    };
  }

  async getReadiness() {
    const checkedAt = new Date().toISOString();
    const uptimeSeconds = Math.round(process.uptime());
    const start = Date.now();

    try {
      const [databaseStatus, redisStatus, rabbitMqStatus, appDiagnostics] = await Promise.all([
        this.getDatabaseDiagnostics(start),
        this.getRedisDiagnostics(),
        this.getRabbitMqDiagnostics(),
        this.getApplicationDiagnostics(),
      ]);

      // Create a summary for quick human understanding
      const summary = {
        app: `${appDiagnostics.uptime.human} ${
          appDiagnostics.uptime.recentlyRestarted ? "(restarted recently)" : ""
        }`,
        db: `${databaseStatus.uptime.human} ${
          databaseStatus.uptime.recentlyRestarted ? "(restarted recently)" : ""
        }`,
        redis: `${redisStatus.status} (latency: ${redisStatus.latency.status})`,
        rabbitmq: `${rabbitMqStatus.status} (latency: ${rabbitMqStatus.latency.status})`,
      };

      return {
        status: "ok",
        checkedAt,
        uptime: this.formatUptime(uptimeSeconds),
        summary,
        application: appDiagnostics,
        database: databaseStatus,
        redis: redisStatus,
        rabbitmq: rabbitMqStatus,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Dependency health check failed";

      throw new ServiceUnavailableException({
        status: "error",
        checkedAt,
        uptime: this.formatUptime(uptimeSeconds),
        application: this.getApplicationDiagnostics(),
        database: {
          status: "down",
          provider: "postgresql",
          latencyMs: Date.now() - start,
          error: message,
        },
      });
    }
  }

  private async getDatabaseDiagnostics(startedAt: number) {
    await this.prisma.$queryRaw`SELECT 1`;

    const [tableCountResult, uptimeResult] = await Promise.all([
      this.prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*) AS count
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
      `,
      this.prisma.$queryRaw<
        Array<{ started_at: Date; uptime_seconds: bigint | number }>
      >`
        SELECT
          pg_postmaster_start_time() AS started_at,
          EXTRACT(EPOCH FROM NOW() - pg_postmaster_start_time()) AS uptime_seconds
      `,
    ]);

    const tableCount = this.toNumber(tableCountResult[0]?.count);
    const databaseStartedAt = uptimeResult[0]?.started_at;
    const databaseUptimeSeconds = this.toNumber(uptimeResult[0]?.uptime_seconds);

    return {
      status: "up",
      latency: this.classifyLatency(Date.now() - startedAt),
      provider: "postgresql",
      tables: {
        total: tableCount,
        schema: "public",
      },
      uptime: this.formatUptime(databaseUptimeSeconds),
      startedAt: databaseStartedAt?.toISOString() ?? null,
    };
  }

  private async getRedisDiagnostics() {
    const startedAt = Date.now();
    const pong = await redis.ping();
    const info = await redis.info("server");
    const parsedInfo = this.parseInfo(info);
    const serverUptimeSeconds = this.toNumber(parsedInfo.uptime_in_seconds);
    const connectionStartedAt = getRedisConnectedAt();

    return {
      status: pong === "PONG" ? "up" : "degraded",
      latency: this.classifyLatency(Date.now() - startedAt),
      version: parsedInfo.redis_version ?? null,
      mode: parsedInfo.redis_mode ?? null,
      uptime: {
        server: this.formatUptime(serverUptimeSeconds),
        connection: connectionStartedAt
          ? this.formatUptime(Math.round((Date.now() - connectionStartedAt.getTime()) / 1000))
          : null,
        connectedAt: connectionStartedAt?.toISOString() ?? null,
      },
    };
  }

  private async getRabbitMqDiagnostics() {
    const startedAt = Date.now();

    if (!conn) {
      throw new Error("RabbitMQ connection is not initialized");
    }

    const channel = await conn.createChannel();

    try {
      await channel.checkQueue("sendEmail");
      await channel.checkQueue("sendGitHubWebhookData");

      const serverProperties = (conn as any)?.connection?.serverProperties ?? {};

      return {
        status: "up",
        latency: this.classifyLatency(Date.now() - startedAt),
        version: serverProperties.version ?? null,
        product: serverProperties.product ?? null,
        queues: {
          totalChecked: 2,
          names: ["sendEmail", "sendGitHubWebhookData"],
        },
        uptime: {
          connection: rabbitMqConnectedAt
            ? this.formatUptime(Math.round((Date.now() - rabbitMqConnectedAt.getTime()) / 1000))
            : null,
          connectedAt: rabbitMqConnectedAt?.toISOString() ?? null,
        },
      };
    } finally {
      await channel.close();
    }
  }

  private getApplicationDiagnostics() {
    const uptimeSeconds = Math.round(process.uptime());
    const modules = [...this.modulesContainer.values()];
    const controllerCount = modules.reduce(
      (count, moduleRef) => count + moduleRef.controllers.size,
      0,
    );
    const providerCount = modules.reduce(
      (count, moduleRef) => count + moduleRef.providers.size,
      0,
    );
    const endpointCount = modules.reduce((count, moduleRef) => {
      const controllerWrappers = [...moduleRef.controllers.values()];
      return (
        count +
        controllerWrappers.reduce((controllerTotal, wrapper) => {
          const prototype = wrapper.metatype?.prototype;
          if (!prototype) return controllerTotal;
          const methodNames = Object.getOwnPropertyNames(prototype).filter(
            (methodName) => methodName !== "constructor",
          );
          return (
            controllerTotal +
            methodNames.filter(
              (methodName) =>
                Reflect.hasMetadata(METHOD_METADATA, prototype[methodName]) ||
                Reflect.hasMetadata(PATH_METADATA, prototype[methodName]),
            ).length
          );
        }, 0)
      );
    }, 0);

    return {
      uptime: this.formatUptime(uptimeSeconds),
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
      },
      structure: {
        modules: modules.length,
        controllers: controllerCount,
        providers: providerCount,
        endpoints: endpointCount,
      },
    };
  }

  private parseInfo(info: string) {
    console.log(info);
    return info
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .reduce<Record<string, string>>((acc, line) => {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) return acc;
        const key = line.slice(0, separatorIndex);
        const value = line.slice(separatorIndex + 1);
        acc[key] = value;
        return acc;
      }, {});
  }

  private toNumber(
    value:
      | bigint
      | number
      | string
      | { toNumber?: () => number; valueOf?: () => unknown; toString?: () => string }
      | null
  ) {
    if (typeof value === "bigint") return this.bigIntToSafeNumber(value);
    if (value && typeof value === "object") {
      if (typeof value.toNumber === "function") {
        const parsed = value.toNumber();
        return Number.isFinite(parsed) ? parsed : null;
      }

      const primitive = typeof value.valueOf === "function" ? value.valueOf() : value;
      if (typeof primitive === "number") return Number.isFinite(primitive) ? primitive : null;
      if (typeof primitive === "bigint") return this.bigIntToSafeNumber(primitive);
      if (typeof primitive === "string") {
        const parsed = Number(primitive);
        return Number.isFinite(parsed) ? parsed : null;
      }

      if (typeof value.toString === "function") {
        const parsed = Number(value.toString());
        return Number.isFinite(parsed) ? parsed : null;
      }
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  private bigIntToSafeNumber(value: bigint) {
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
    const minSafe = BigInt(Number.MIN_SAFE_INTEGER);

    if (value > maxSafe || value < minSafe) return null;

    return Number(value);
  }

  private formatUptime(seconds: number | null) {
    if (!seconds || seconds <= 0) return { seconds: 0, human: "0s", recentlyRestarted: true };

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let human = "";
    if (days) human += `${days}d `;
    if (hours) human += `${hours}h `;
    if (minutes) human += `${minutes}m `;
    human += `${secs}s`;

    const recentlyRestarted = seconds < 300; // less than 5 minutes considered recently restarted

    return { seconds, human: human.trim(), recentlyRestarted };
  }

  private classifyLatency(ms: number | null) {
    if (ms === null) return { value: 0, status: "unknown" };
    let status = "fast";
    if (ms >= 500) status = "slow";
    else if (ms >= 100) status = "ok";
    return { value: ms, status };
  }
}
