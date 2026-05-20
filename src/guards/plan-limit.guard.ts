import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Req } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_LIMIT_KEY, LimitMeta } from '../decorators/check-limit.decorator';
import { PLAN_LIMITS } from '../config/plan-limits.config';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta: LimitMeta = this.reflector.get(CHECK_LIMIT_KEY, context.getHandler());
    if (!meta) return true;

    const req = context.switchToHttp().getRequest() as Request;
    const userId = req.session.user.id;
    let planLimits: typeof PLAN_LIMITS.Free = {
        workflows: 3,
        actions_per_workflow: 12
    };

    // Find the user plan
    const userPlan = await this.prisma.subscriptions.findFirst({
        where: {
            userId,
            status: "active"
        },
        select: {
            plan: true
        }
    });

    if(userPlan && userPlan.plan) planLimits = PLAN_LIMITS[userPlan.plan];

    const limit: number = planLimits[meta.resource];
    if (limit === Infinity) return true;

    // ── Workflows ──────────────────────────────────────────────
    if (meta.resource === 'workflows') {
      const count = await this.prisma.workflow.count({ where: { userId } });
      if (count >= limit) {
        throw new ForbiddenException(
          `Your ${userPlan?.plan ?? "Free"} plan allows max ${limit} workflows. Please upgrade.`,
        );
      }
    }

    // ── Actions (scoped per workflow) ──────────────────────────
    if (meta.resource === 'actions_per_workflow') {
      const workflowId = req.params[meta.parentParam ?? 'workflowId'];
      if (!workflowId || Array.isArray(workflowId)) throw new ForbiddenException('Workflow ID is required');

      // Make sure this workflow belongs to the user
      const workflow = await this.prisma.workflow.findUnique({ where: { id: workflowId, userId } });
      if (!workflow) throw new ForbiddenException('Workflow not found');

      const count = await this.prisma.action.count({ where: { workflowId } });
      if (count >= limit) {
        throw new ForbiddenException(
          `Your ${userPlan?.plan ?? "Free"} plan allows max ${limit} actions per workflow. Please upgrade.`,
        );
      }
    }

    return true;
  }
}
