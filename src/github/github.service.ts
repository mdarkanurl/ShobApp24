import { BadRequestException, ConflictException, HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { redis } from "../redis";
import { randomUUID, UUID } from "crypto";

@Injectable()
export class GithubService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private getGithubClientId() {
    const clientId = process.env.GITHUB_CLIENT_ID;

    if (!clientId) {
      throw new HttpException("GitHub client ID is not configured", 500);
    }

    return clientId;
  }

  private getGithubClientSecret() {
    const clientSecret =
      process.env.GITHUB_CLIENT_SECRET;

    if (!clientSecret) {
      throw new HttpException("GitHub client secret is not configured", 500);
    }

    return clientSecret;
  }

  private getGithubRedirectUri() {
    return (
      process.env.GITHUB_REDIRECT_URI ??
      `${process.env.BETTER_AUTH_URL}/api/v1/github/callback`
    );
  }

  private async githubApi<T>(token: string, url: string): Promise<T> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      throw new HttpException("GitHub API request failed", response.status);
    }

    return (await response.json()) as T;
  }

  async connect(
    userId: UUID
  ) {
    const state = randomUUID();
    await redis.set(`github_oauth_state:${state}`, userId, "EX", 600);

    const params = new URLSearchParams({
      client_id: this.getGithubClientId(),
      redirect_uri: this.getGithubRedirectUri(),
      scope: "read:user repo:status admin:repo_hook",
      state,
    });

    return {
      authorizeUrl: `https://github.com/login/oauth/authorize?${params.toString()}`,
    };
  }

  async callback(
    query: { code: string; state: string },
    userId: UUID,
  ) {
    const { code, state } = query;

    if (!code || !state) {
      throw new BadRequestException("Missing OAuth callback parameters");
    }

    const stateUserId = await redis.get(`github_oauth_state:${state}`);

    if (!stateUserId || stateUserId !== userId) {
      throw new BadRequestException("Invalid OAuth state");
    }

    await redis.del(`github_oauth_state:${state}`);

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: this.getGithubClientId(),
        client_secret: this.getGithubClientSecret(),
        code,
        redirect_uri: this.getGithubRedirectUri(),
        state,
      }),
    });

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new BadRequestException(
        "Failed to exchange GitHub OAuth code",
      );
    }

    const githubUser = await this.githubApi<{ id: number; login: string }>(
      tokenData.access_token,
      "https://api.github.com/user",
    );

    const githubAccountId = githubUser.id.toString();

    await this.prisma.$transaction(async (tx) => {
      const alreadyLinked = await tx.account.findFirst({
        where: {
          providerId: "github",
          accountId: githubAccountId,
        },
      });

      if (alreadyLinked && alreadyLinked.userId !== userId) {
        throw new ConflictException(
          "This GitHub account is already connected to another user",
        );
      }

      const existing = await tx.account.findFirst({
        where: {
          userId: userId,
          providerId: "github",
        },
      });

      if (existing) {
        await tx.account.update({
          where: {
            id: existing.id,
          },
          data: {
            accountId: githubAccountId,
            accessToken: tokenData.access_token,
            scope: tokenData.scope ?? null,
          },
        });
      } else {
        await tx.account.create({
          data: {
            id: randomUUID(),
            userId: userId,
            providerId: "github",
            accountId: githubAccountId,
            accessToken: tokenData.access_token,
            scope: tokenData.scope ?? null,
          },
        });
      }
    });

    return {
      connected: true,
      githubLogin: githubUser.login,
    };
  }
}
