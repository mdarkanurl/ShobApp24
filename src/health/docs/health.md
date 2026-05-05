# Health Module

The Health module provides REST API endpoints for monitoring the application's health status. It offers liveness and readiness checks to determine if the service is running and able to handle requests.

## Overview

The module handles:

- **Liveness check**: Simple endpoint to verify the service is running
- **Readiness check**: Comprehensive health check of all dependencies (database, Redis, RabbitMQ)

## Architecture

### Module Dependencies

```
HealthModule
├── ConfigModule
├── HealthService
└── HealthController
```

## API Endpoints

### Liveness Check

- **Endpoint**: `GET /api/v1/health`
- **Authentication**: Not required (`@AllowAnonymous()`)
- **Rate Limit**: 30 requests per 60 seconds
- **Response**:

```typescript
{
  status: 'ok';
  checkedAt: string; // ISO date string
  uptime: {
    seconds: number;
    human: string; // e.g., "2h 30m 15s"
    recentlyRestarted: boolean;
  }
  service: 'up';
}
```

- **Notes**:
  - Used by Kubernetes liveness probes
  - Does not check external dependencies

### Readiness Check

- **Endpoint**: `GET /api/v1/health/ready`
- **Authentication**: Not required (`@AllowAnonymous()`), but requires a secret header
- **Rate Limit**: 10 requests per 60 seconds
- **Required Header**: `x-health-check-secret`
- **Response**:

```typescript
{
  status: "ok";
  checkedAt: string;
  uptime: { seconds: number; human: string; recentlyRestarted: boolean };
  summary: {
    app: string;
    db: string;
    redis: string;
    rabbitmq: string;
  };
  application: {
    uptime: { seconds: number; human: string; recentlyRestarted: boolean };
    process: {
      pid: number;
      nodeVersion: string;
      platform: string;
      memoryUsage: { heapUsed: number; heapTotal: number; external: number; rss: number };
    };
    structure: {
      modules: number;
      controllers: number;
      providers: number;
      endpoints: number;
    };
  };
  database: {
    status: "up";
    latency: { value: number; status: "fast" | "ok" | "slow" };
    provider: "postgresql";
    tables: { total: number; schema: string };
    uptime: { seconds: number; human: string; recentlyRestarted: boolean };
    startedAt: string | null;
  };
  redis: {
    status: "up" | "degraded";
    latency: { value: number; status: "fast" | "ok" | "slow" };
    version: string | null;
    mode: string | null;
    uptime: {
      server: { seconds: number; human: string; recentlyRestarted: boolean };
      connection: { seconds: number; human: string; recentlyRestarted: boolean } | null;
      connectedAt: string | null;
    };
  };
  rabbitmq: {
    status: "up";
    latency: { value: number; status: "fast" | "ok" | "slow" };
    version: string | null;
    product: string | null;
    queues: { totalChecked: number; names: string[] };
    uptime: {
      connection: { seconds: number; human: string; recentlyRestarted: boolean } | null;
      connectedAt: string | null;
    };
  };
}
```

- **Error Response** (503 Service Unavailable):

```typescript
{
  status: "error";
  checkedAt: string;
  uptime: { seconds: number; human: string; recentlyRestarted: boolean };
  application: { ... };
  database: {
    status: "down";
    provider: "postgresql";
    latencyMs: number;
    error: string;
  };
}
```

- **Notes**:
  - Used by Kubernetes readiness probes
  - Requires `HEALTH_CHECK_SECRET` environment variable to match the `x-health-check-secret` header
  - Checks all external dependencies: PostgreSQL, Redis, RabbitMQ
  - Validates RabbitMQ queues: `sendEmail`, `sendGitHubWebhookData`

## Latency Classification

| Response Time | Status |
| ------------- | ------ |
| < 100ms       | `fast` |
| 100-500ms     | `ok`   |
| >= 500ms      | `slow` |

## Uptime Detection

A service is considered "recently restarted" if its uptime is less than 5 minutes (300 seconds).

## Error Handling

- `403 Forbidden`: Invalid or missing health check secret for readiness endpoint
- `503 Service Unavailable`: One or more dependencies are down

## Rate Limiting

- Liveness: 30 requests/60s
- Readiness: 10 requests/60s
