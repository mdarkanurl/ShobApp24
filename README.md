# ShobApp24

**GitHub automation platform built for developers who need more than Actions.** ShobApp24 lets you install a GitHub App, listen to real-time webhook events across your repositories, and trigger custom automation pipelines - send emails, run AI analytics, fire webhooks, push Telegram messages, or collect viewer data. Think n8n, but scoped entirely around GitHub events and built as a production-grade multi-tenant SaaS.

---

## Why I Built It This Way

Most automation tools treat GitHub as one of many integrations. I built ShobApp24 with GitHub as the core - every architectural decision was made to handle GitHub webhooks reliably at scale. That meant making early choices around asynchronous processing, message queuing, and proper multi-tenancy that many hobby projects skip until it's too late to retrofit.

The result is a codebase that handles distributed event processing, Stripe billing with proration logic, plan-based feature enforcement, and AI-powered analytics - all while staying readable and maintainable.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22, TypeScript 5.7 |
| Framework | NestJS 11 (Express) |
| Database | PostgreSQL via Prisma ORM 7 |
| Cache / Rate Limiting | Redis 7 |
| Message Queue | RabbitMQ |
| Auth | BetterAuth (email/password) |
| Payments | Stripe SDK |
| AI | Google Gemini |
| Email | Resend |
| GitHub | Octokit |
| Validation | Zod 4 |
| Testing | Jest, Supertest |
| CI/CD | GitHub Actions → Docker Hub → GCP VM |

---

## Architecture

### Module Structure

The application is organized into focused NestJS modules with strict separation between layers. Each domain owns its controller, service, and data access logic - nothing bleeds across boundaries:

```
src/
├── auth/          # BetterAuth integration - signup, sessions, verification
├── github/        # GitHub OAuth, webhook ingestion, repo listing
├── workflow/      # Workflow CRUD and plan-limit enforcement
├── action/        # Action step management per workflow
├── stripe/        # Subscription lifecycle, checkout, billing portal
├── worker/
│   ├── github/    # Async GitHub webhook processor
│   ├── stripe/    # Async Stripe event processor
│   └── send-email/ # Async email dispatch worker
├── health/        # Liveness + readiness probes
├── rate-limit/    # Redis-backed rate limiting
└── guards/        # Plan limit enforcement guards
```

The API layer (controllers) never touches the database directly. All data access goes through Prisma service calls inside domain services. This isn't just NestJS convention - it means I can swap or mock the data layer cleanly in tests without any surgery.

### Why RabbitMQ for Webhook Processing

GitHub webhooks arrive fast and expect a quick HTTP response. If you process the event synchronously - trigger emails, call Gemini, hit third-party webhooks - you will time out and GitHub will retry, causing duplicate runs.

The architecture handles this properly: the `/github/webhook` endpoint verifies the signature, drops the payload onto the `sendGitHubWebhookData` queue, and returns `200` immediately. A separate GitHub worker consumer picks it up, identifies the event type, and runs the appropriate handler. Same pattern for Stripe events and outbound email.

Three independent workers. Three queues. Dead-letter handling on all of them so failed events don't silently disappear.

### Event Handler Strategy Pattern

The GitHub worker doesn't use a giant switch statement. It dynamically selects a handler class based on the incoming webhook event type. Adding support for a new GitHub event means creating a new handler class and registering it - the worker dispatch logic doesn't change. Currently handles 17+ event types including `push`, `issues`, `pull_request`, `star`, `fork`, `release`, and more.

### Plan Enforcement via Decorators

Plan limits (workflow count, actions per workflow) are enforced via custom NestJS decorators and guards - `@CheckLimit` on the relevant endpoints. The guard reads the user's current plan from the database, compares against configured limits, and throws before the service layer is ever called.

```
Free  → 3 workflows, 12 actions per workflow
Basic → 7 workflows, 20 actions per workflow
Pro   → Unlimited
```

This approach keeps business rules out of service methods and makes limits trivially easy to reconfigure or test independently.

---

## Key Engineering Decisions

**Prisma over raw SQL.** Type-safe queries, schema-as-code, and migration safety were worth the tradeoff. Every query is validated at compile time - no more `any`-typed database results sneaking into the response layer.

**Zod 4 for validation.** NestJS's built-in class-validator works, but Zod gives sharper error messages, composable schemas, and runtime safety that integrates cleanly with TypeScript's type system. All incoming request bodies are validated at the controller boundary before reaching services.

**BetterAuth over rolling custom auth.** Auth is infrastructure, not a differentiator. BetterAuth handles session management, password hashing, and email verification flows correctly. I focused engineering effort on the product logic.

**Stripe proration handled server-side.** Subscription upgrades, downgrades, and cancellations all go through Stripe's proration API. The webhook processor keeps local subscription state in sync - Stripe is the source of truth, the local `Subscription` model is a cache for plan checks.

**Redis for rate limiting, not a database.** Rate limit counters are ephemeral by nature. Putting them in Postgres would add unnecessary write load and complicate cleanup. Redis with TTL-based keys is the right tool.

---

## API Reference

All endpoints are prefixed with `/api/v1/`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/sign-up/email` | Register with email and password |
| POST | `/auth/sign-in/email` | Sign in, returns session token |

### GitHub
| Method | Endpoint | Description |
|---|---|---|
| GET | `/github/connect` | Start GitHub App OAuth flow |
| GET | `/github/callback` | OAuth callback handler |
| POST | `/github/webhook` | Incoming GitHub webhook receiver |
| GET | `/github/repos` | List connected repositories (paginated) |

### Workflows & Actions
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/workflow/` | List or create workflows |
| GET/PATCH/DELETE | `/workflow/:id` | Read, update, or delete a workflow |
| POST | `/action/:workflowId` | Add an action step to a workflow |

### Stripe
| Method | Endpoint | Description |
|---|---|---|
| POST | `/stripe/create-checkout-session` | Start subscription checkout |
| POST | `/stripe/webhook` | Incoming Stripe event receiver |

### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health/` | Liveness probe |
| GET | `/health/ready` | Readiness probe (checks Postgres, Redis, RabbitMQ) |

---

## Action Types

Each workflow is made up of ordered action steps. The following action types are supported:

- **Send Email** - to any address, to yourself, or to the GitHub event triggerer
- **Forward via Webhook** - POST the event payload to any URL
- **Send Telegram Message** - push a message to a configured Telegram bot
- **Collect Viewer Data** - pull repository traffic/viewer data from the GitHub API
- **AI Analytics** - analyze the event using Google Gemini with a configurable prompt

---

## Database Schema

Core models and their relationships:

```
User ──< Session
     ──< Account
     ──< GitHubConnection ──< GitHubRepo
     ──< Workflow ──< Action
                 ──< WorkflowRun ──< ActionRun
     ──< Subscription
     ──< Payment
```

`WorkflowRun` and `ActionRun` give a full execution history - every workflow execution is logged with its status and output, making debugging straightforward and giving users visibility into what ran and when.

---

## CI/CD Pipeline

### Build Workflow (`.github/workflows/build.yml`)

Triggers on every pull request and push to `main`:

1. Set up Node.js 22 and pnpm 10
2. Install dependencies with frozen lockfile (`--frozen-lockfile`)
3. Generate Prisma client
4. Build the NestJS application
5. Run unit tests (`pnpm test`)
6. Run end-to-end tests (`pnpm test:e2e`)
7. On `main` branch success - commit and push generated artifacts

### Deploy Workflow (`.github/workflows/deploy.yml`)

On successful `main` build:

1. Build Docker image
2. Push to Docker Hub
3. SSH into GCP VM and pull the new image
4. Zero-downtime restart via Docker Compose

No manual deployments. Every merge to `main` that passes tests ships to production.

---

## Local Development

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker and Docker Compose

### Setup

```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres, Redis, RabbitMQ)
docker compose -f docker-compose.local.yml up -d

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Configure environment
cp .env.example .env
# Fill in your credentials (GitHub App, Stripe, Gemini, Resend, etc.)

# Start dev server with hot reload
pnpm start:dev
```

### Testing

```bash
# Unit tests
pnpm test

# Unit tests with coverage
pnpm test:cov

# End-to-end tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

---

## Security

- **Webhook signature verification** on all incoming GitHub and Stripe webhooks - unsigned requests are rejected before any processing occurs
- **Input validation** at every controller boundary via Zod and NestJS validation pipes
- **Rate limiting** via Redis on sensitive endpoints (e.g. 15 req/min on GitHub connect)
- **CORS** configured with explicit trusted origins
- **Environment-based secrets** - no credentials in code, all loaded from `.env`
- **Session management** with expiration enforced by BetterAuth

---

## Project Structure

```
shobapp24/
├── src/
│   ├── main.ts                  # Bootstrap - global prefix, versioning, CORS, pipes
│   ├── app.module.ts            # Root module - imports all feature modules
│   ├── config.ts                # Environment variable loading with defaults
│   ├── auth/
│   ├── github/
│   ├── workflow/
│   ├── action/
│   ├── stripe/
│   ├── worker/
│   │   ├── github/
│   │   ├── stripe/
│   │   └── send-email/
│   ├── health/
│   ├── rate-limit/
│   └── guards/
├── prisma/
│   └── schema.prisma
├── test/                        # E2E test suite
├── .github/
│   └── workflows/
│       ├── build.yml
│       └── deploy.yml
├── docker-compose.local.yml
└── .env.example
```

---

## Contributing

Contributions, issues, and feature requests are welcome! Please follow the guidelines outlined in the [contributing.md](contributing.md) file.

## License

MIT License
