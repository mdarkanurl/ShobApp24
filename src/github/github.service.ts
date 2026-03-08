import { BadRequestException, ConflictException, HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { redis } from "../redis";
import { randomUUID, UUID } from "crypto";

@Injectable()
export class GithubService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private getGitHubAppName() {
    const githubAppName =
      process.env.GITHUB_APP_NAME;

    if (!this.getGitHubAppName) {
      throw new HttpException("GitHub app not is not configured", 500);
    }

    return githubAppName;
  }

  async connect(
    userId: UUID
  ) {
    const state = randomUUID();
    await redis.set(`github_connction_state:${state}`, userId, "EX", 600);

    return `
      https://github.com/apps/${this.getGitHubAppName() ||
      "shobapp24"}/installations/new?state=${state}`;
  }

  async callback(
    query: { installation_id: number; state: string },
    userId: UUID,
  ) {
    try {
      console.log("Is this oaky!");
      const { installation_id, state } = query;

      if (!installation_id || !state) {
        throw new BadRequestException("Missing callback parameters");
      }

      const stateUserId = await redis.get(`github_connction_state:${state}`);

      if (!stateUserId || stateUserId !== userId) {
        throw new BadRequestException("Invalid connection state");
      }

      await this.prisma.githubConnections.create({
        data: {
          userId,
          installationId: installation_id,
        }
      });

      await redis.del(`github_connction_state:${state}`);
      return {};
    } catch (error) {
      throw error;
    }
  }
}
