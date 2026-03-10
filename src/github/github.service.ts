import { BadRequestException, HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { redis } from "../redis";
import { randomUUID, UUID } from "crypto";
import { sendGitHubWebhookData } from "src/utils/rabbitmq";

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
      const { installation_id, state } = query;

      if (!installation_id || !state) {
        throw new BadRequestException("Missing callback parameters");
      }

      const stateUserId = await redis.get(`github_connction_state:${state}`);

      if (!stateUserId || stateUserId !== userId) {
        throw new BadRequestException("Invalid connection state");
      }

      await this.prisma.githubConnection.create({
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

  async getAllUserRepo(
    userId: UUID,
    limit: number,
    page: number,
  ) {
    try {
      const skip = (page - 1) * limit;
      const whereClause = { userId };

      const [total, repos] = await this.prisma.$transaction([
        this.prisma.gitHubRepo.count({
          where: whereClause
        }),
        this.prisma.gitHubRepo.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { repoId: "desc" }
        })
      ]);

      return {
        data: repos,
        pagination: {
          totalItems: total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          pageSize: limit,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    } catch (error) {
      throw error;
    }
  }
}
