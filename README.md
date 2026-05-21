# ShobApp24

## Description

A GitHub automation platform built with Node.js, TypeScript, and NestJS. ShobApp24 lets you install a GitHub App, listen to real-time webhook events across your repositories, and trigger custom automation pipelines - think n8n, but scoped entirely around GitHub and built as a production-grade multi-tenant SaaS.

Key capabilities:
- Real-time GitHub webhook processing for 17+ event types.
- Configurable workflows with ordered action steps per repository.
- Secure code execution triggered by events via isolated workers.
- Event-driven architecture with RabbitMQ and three independent worker queues.
- Stripe subscriptions with plan-based feature enforcement.
- AI-powered analytics using Google Gemini on commit and repo events.

## Features

- GitHub Workflows - Create workflows triggered by specific GitHub events on selected repositories.
- Action Steps - Send emails, forward webhooks, push Telegram messages, collect viewer data, or run AI analytics.
- Async Processing - RabbitMQ workers handle all GitHub and Stripe events asynchronously with dead-letter queues.
- Subscription Plans - Three tiers (Free, Basic, Pro) with Stripe checkout, proration, and billing portal.
- Plan Enforcement - Custom NestJS guards enforce workflow and action limits per plan before hitting services.
- Security - Webhook signature verification, JWT sessions, Redis rate limiting, and input validation via Zod.
- Observability - Liveness and readiness health endpoints with deep checks on Postgres, Redis, and RabbitMQ.

## Tech Stack

- Backend: Node.js 22, TypeScript 5.7, NestJS 11
- Database: PostgreSQL, Prisma ORM 7
- Messaging: RabbitMQ
- Cache / Rate Limiting: Redis 7
- Auth: BetterAuth
- Payments: Stripe SDK
- AI: Google Gemini
- Email: Resend
- GitHub: Octokit
- Validation: Zod 4
- Package Manager: pnpm
- Testing: Jest, Supertest
- CI/CD: GitHub Actions, Docker Hub, GCP VM

## Architecture

The application is organized into focused NestJS modules. Each domain owns its controller, service, and data access logic with no cross-boundary leakage.

Core modules:
- `auth` - Email/password signup, sessions, email verification, password reset.
- `github` - GitHub App OAuth flow, webhook ingestion, paginated repo listing.
- `workflow` - Workflow CRUD with plan-limit enforcement.
- `action` - Action step management per workflow.
- `stripe` - Subscription checkout, upgrades, downgrades, cancellation, billing portal.
- `worker/github` - Async processor for incoming GitHub webhook events.
- `worker/stripe` - Async processor for incoming Stripe events.
- `worker/send-email` - Async outbound email dispatcher.
- `health` - Liveness and readiness probes.
- `rate-limit` - Redis-backed request rate limiting.
- `guards` - Plan limit enforcement via `@CheckLimit` and `@RateLimit` decorators.

GitHub webhook events are never processed synchronously. The `/github/webhook` endpoint verifies the signature, enqueues the payload, and returns `200` immediately. A dedicated worker picks it up and dispatches to the correct handler using the strategy pattern - no switch statements, new event types are added by registering a new handler class.

Plan limits are enforced via guards that intercept requests before the service layer is ever reached:

```
Free  - 3 workflows, 12 actions per workflow
Basic - 7 workflows, 20 actions per workflow
Pro   - Unlimited
```

## Setup Instructions
 
### Option 1: Docker Compose (recommended)
 
#### Prerequisites
- Docker and Docker Compose
#### Steps
 
1. Configure environment variables:
   ```bash
   cp .env.example .env
   # Fill in credentials for GitHub App, Stripe, Resend, etc.
   ```
 
2. Start everything:
   ```bash
   docker compose -f docker-compose.local.yml up -d
   ```
 
That's it. Docker Compose spins up the app along with Postgres, Redis, and RabbitMQ in one command.
 
---
 
### Option 2: Manual Setup
 
#### Prerequisites
- Node.js 22+
- pnpm 10+
#### Steps
 
1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Fill in credentials for GitHub App, Stripe, Resend, etc.
   ```
 
3. Generate Prisma client and push schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
 
4. Start the dev server:
   ```bash
   pnpm start:dev
   ```

## Testing

```bash
pnpm test           # Unit tests
pnpm test:cov       # Unit tests with coverage
pnpm test:e2e       # End-to-end tests
pnpm test:watch     # Watch mode
```

## CI/CD

Every pull request and push to `main` runs the full build and test pipeline via GitHub Actions:

1. Install dependencies with frozen lockfile
2. Generate Prisma client
3. Build the application
4. Run unit and end-to-end tests

On a successful `main` build, the deploy workflow builds a Docker image, pushes it to Docker Hub, SSHs into the GCP VM, and restarts the service via Docker Compose. No manual deployments.

## Contributing

Contributions, issues, and feature requests are welcome! Please follow the guidelines outlined in the [contributing.md](contributing.md) file.

## License

MIT License
