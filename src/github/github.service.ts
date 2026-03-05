import { BadRequestException, HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { PrismaService } from "../prisma/prisma.service";
import { redis } from "../redis";
import { randomUUID } from "crypto";

@Injectable()
export class GithubService {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  private getGithubClientId() {
    const clientId = process.env.GITHUB_CLIENT_ID ?? process.env.CLIENT_ID;

    if (!clientId) {
      throw new HttpException("GitHub client ID is not configured", 500);
    }

    return clientId;
  }

  private getGithubClientSecret() {
    const clientSecret =
      process.env.GITHUB_CLIENT_SECRET ?? process.env.CLIENT_SECRET;

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

  private async getCurrentUser(headers: Record<string, any>) {
    const session = await this.auth.api.getSession({ headers });

    if (!session?.user?.id) {
      throw new UnauthorizedException("You must be logged in");
    }

    return session.user;
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

  async connect(headers: Record<string, any>) {
    const user = await this.getCurrentUser(headers);
    const state = randomUUID();

    await redis.set(`github_oauth_state:${state}`, user.id, "EX", 600);

    const params = new URLSearchParams({
      client_id: this.getGithubClientId(),
      redirect_uri: this.getGithubRedirectUri(),
      scope: "repo read:user",
      state,
    });

    return {
      authorizeUrl: `https://github.com/login/oauth/authorize?${params.toString()}`,
    };
  }

  async callback(
    query: { code: string; state: string },
    headers: Record<string, any>,
  ) {
    const { code, state } = query;

    if (!code || !state) {
      throw new BadRequestException("Missing OAuth callback parameters");
    }

    const user = await this.getCurrentUser(headers);
    const stateUserId = await redis.get(`github_oauth_state:${state}`);

    if (!stateUserId || stateUserId !== user.id) {
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
        tokenData.error_description ?? "Failed to exchange GitHub OAuth code",
      );
    }

    const githubUser = await this.githubApi<{ id: number; login: string }>(
      tokenData.access_token,
      "https://api.github.com/user",
    );

    const existing = await this.prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "github",
      },
    });

    if (existing) {
      await this.prisma.account.update({
        where: {
          id: existing.id,
        },
        data: {
          accountId: githubUser.id.toString(),
          accessToken: tokenData.access_token,
          scope: tokenData.scope ?? null,
        },
      });
    } else {
      await this.prisma.account.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          providerId: "github",
          accountId: githubUser.id.toString(),
          accessToken: tokenData.access_token,
          scope: tokenData.scope ?? null,
        },
      });
    }

    return {
      connected: true,
      githubLogin: githubUser.login,
    };
  }
}
