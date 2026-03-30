import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { HealthService } from "./health.service";

@Controller({ path: "health", version: "1" })
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @AllowAnonymous()
  @RateLimit({ points: 30, duration: 60 })
  @HttpCode(HttpStatus.OK)
  checkLiveness() {
    return this.healthService.getLiveness();
  }

  @Get("ready")
  @AllowAnonymous()
  @RateLimit({ points: 10, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async checkReadiness(
    @Headers("x-health-check-secret") healthCheckSecret?: string,
  ) {
    const expectedSecret =
      this.configService.get<string>("HEALTH_CHECK_SECRET");

    // if (!expectedSecret || healthCheckSecret !== expectedSecret) {
    //   throw new ForbiddenException("Invalid health check secret");
    // }

    return this.healthService.getReadiness();
  }
}
