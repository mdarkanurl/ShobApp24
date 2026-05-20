# ShobApp24

It's an automation tool for GitHub, similar to n8n but focused on GitHub workflows. Users install our GitHub app, we listen to GitHub events in real time, then process them and run custom actions like sending emails, analyzing events with LLMs, and more.

## Features

- **GitHub App Integration** — OAuth connection flow, real-time webhook processing for 17+ event types (push, issues, pull_request, star, etc.), and paginated repo listing
- **Workflow Engine** — Create workflows triggered by specific GitHub events on selected repos, with ordered action steps and plan-based limits (Free: 3 workflows / 12 actions per workflow, Basic: 7 / 20, Pro: unlimited)
- **Action Types** — Send email (to any address, to yourself, to the event triggerer, etc.), forward data via webhook, send Telegram messages, collect viewer data via GitHub API, and run AI-powered analytics using Google Gemini
- **Stripe Subscription Plans** — 3 tiers (Free, Basic, Pro) with checkout, upgrades/downgrades with proration, cancellation, invoice history, and billing portal
- **Authentication & Authorization** — Email/password signup, email verification, password reset, session management, Redis-backed rate limiting, and plan-limit enforcement
- **Background Processing** — All GitHub and Stripe webhook events are processed asynchronously via RabbitMQ queues with dead-letter handling
- **Health Monitoring** — Liveness and readiness endpoints with deep dependency checks (Postgres, Redis, RabbitMQ)

## Tech Stack

| Category | Technology |
|---|---|
| **Runtime** | Node.js 22, TypeScript 5.7 |
| **Framework** | NestJS 11 (Express) |
| **Database** | PostgreSQL via Prisma ORM 7 |
| **Cache / Rate Limit** | Redis 7 |
| **Message Queue** | RabbitMQ (3 queues) |
| **Auth** | BetterAuth (email/password) |
| **Payments** | Stripe SDK |
| **AI** | Google Gemini |
| **Email** | Resend |
| **GitHub** | Octokit |
| **Validation** | Zod 4 |
| **Testing** | Jest, Supertest |
| **CI/CD** | GitHub Actions → Docker Hub → GCP VM |

## Getting Started / Prerequisites

**Prerequisites:** Node.js 22, pnpm 10, Docker (for Postgres, Redis, RabbitMQ)

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure services
docker compose -f docker-compose.local.yml up -d postgres redis rabbitmq

# 3. Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# 4. Configure environment
cp .env.example .env
# Then edit .env with your credentials

# 5. Start dev server (watch mode)
pnpm start:dev
```

## Worker (Background Processing)

The app uses a worker architecture with 3 independent consumers, each consuming from its own RabbitMQ queue:

| Worker | Queue | Description |
|---|---|---|
| **GitHub Worker** | `sendGitHubWebhookData` | Receives GitHub webhook payloads, matches them against workflows, executes actions (email, webhook, AI analytics, etc.) |
| **Stripe Worker** | `sendStripeWebhookData` | Processes Stripe subscription and payment events asynchronously |
| **Email Worker** | `sendEmail` | Sends transactional emails via Resend API (decoupled from webhook processing for reliability) |

Each worker runs as a standalone Node.js process and communicates via RabbitMQ, ensuring webhook responses are fast and processing is resilient with dead-letter queues for failed messages.

## API Documentation

All endpoints are prefixed with `/api/v1/`. Detailed API docs are available per module:

| Module | Docs | Endpoints |
|---|---|---|
| **Auth** | [`src/auth/docs/auth.md`](src/auth/docs/auth.md) | sign-up, sign-in, verify-email, password-reset, session |
| **GitHub** | [`src/github/docs/github.md`](src/github/docs/github.md) | connect, callback, webhook, repos |
| **Workflow** | [`src/workflow/docs/workflow.md`](src/workflow/docs/workflow.md) | CRUD workflows |
| **Action** | [`src/action/docs/action.md`](src/action/docs/action.md) | CRUD actions, 17 action types |
| **Workflow Run** | [`src/workflow-run/docs/workflow-run.md`](src/workflow-run/docs/workflow-run.md) | list, get workflow runs |
| **Action Run** | [`src/action-run/docs/action-run.md`](src/action-run/docs/action-run.md) | list, get action runs |
| **Stripe** | (inline) | checkout, plan changes, invoices, billing portal |
| **Health** | [`src/health/docs/health.md`](src/health/docs/health.md) | liveness, readiness |

### Quick Route Overview

```
POST   /api/v1/auth/sign-up/email         — Register
POST   /api/v1/auth/sign-in/email         — Login
POST   /api/v1/github/connect             — Connect GitHub account
POST   /api/v1/github/webhook             — GitHub webhook receiver
POST   /api/v1/workflow/                  — Create workflow
GET    /api/v1/workflow/                  — List workflows
POST   /api/v1/action/:workflowId         — Create action in workflow
POST   /api/v1/stripe/create-checkout-session — Create checkout
POST   /api/v1/stripe/webhook             — Stripe webhook receiver
GET    /api/v1/health/                    — Liveness check
GET    /api/v1/health/ready               — Readiness check
```
