import { BadRequestException, HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { redis } from "../redis";
import { randomUUID, UUID } from "crypto";
import { sendGitHubWebhookData } from "../utils/rabbitmq";
import { ConfigService } from '@nestjs/config';
import { EventType, Platform } from "@prisma/client";

@Injectable()
export class GithubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getGitHubAppName() {
    const githubAppName =
      this.configService.get<string>('GITHUB_APP_NAME') || "shobapp24";

    if (!githubAppName) {
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

      const installation = await this.prisma.githubConnection
        .count({
          where: {
            installationId: installation_id,
          }
        });

      if(installation) {
        await redis.del(`github_connction_state:${state}`);

        // Update the installationId
        await this.prisma.githubConnection.update({
          where: {
            installationId: installation_id,
          },
          data: {
            userId
          }
        });
        return {};
      }
      
      throw new BadRequestException("Installtion not found try again");
    } catch (error) {
      throw error;
    }
  }

  async receiveWebhookFromGitHub(
    body: any,
    event: EventType
  ) {
    try {
        await sendGitHubWebhookData({
          event,
          data: body
        });
        
        return true;
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

      // get github connection ID
      const githubConnectionId = await this.prisma.githubConnection.findFirst({
        where: {
          userId,
        },
        select: {
          id: true
        }
      });

      if(!githubConnectionId) throw new NotFoundException();

      const whereClause = { GithubConnectionsId: githubConnectionId?.id };

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
