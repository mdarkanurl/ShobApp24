# GitHub Module

The GitHub module handles GitHub integration including OAuth connection, webhook processing, and repository management.

## Overview

The module provides:

- GitHub App OAuth connection flow
- Webhook endpoint for receiving GitHub events
- Repository listing for connected users

## Architecture

### Module Dependencies

```
GithubModule
├── PrismaModule (database access)
├── GithubService
└── GithubController
```

### External Services

- **Redis**: Stores OAuth state for connection flow
- **RabbitMQ**: Queues incoming webhook data for processing

## API Endpoints

### Connect GitHub Account

- **Endpoint**: `POST /api/v1/github/connect`
- **Rate Limit**: 15 requests per 60 seconds
- **Authentication**: Session-based
- **Response**: GitHub App installation URL
- **Flow**:
  1. Generates a UUID state token stored in Redis (10-minute expiry)
  2. Returns URL to redirect user to GitHub App installation page

### GitHub Callback

- **Endpoint**: `GET /api/v1/github/callback`
- **Authentication**: Session-based
- **Query Parameters**:
  - `installation_id`: GitHub App installation ID
  - `state`: OAuth state token
- **Response**: Connection success status
- **Flow**:
  1. Validates state token from Redis
  2. Checks if installation already exists
  3. Updates existing connection or creates new one

### Webhook Receiver

- **Endpoint**: `POST /api/v1/github/webhook`
- **Authentication**: None (public endpoint)
- **Headers**:
  - `X-Hub-Signature-256`: HMAC-SHA256 signature
  - `X-GitHub-Event`: Event type
- **Security**:
  - Verifies webhook signature using `GITHUB_SECRET`
  - Rejects invalid or missing signatures
  - Validates JSON payload
- **Response**: Acknowledgment of receipt
- **Flow**:
  1. Verifies signature
  2. Parses JSON body
  3. Queues event data to RabbitMQ for processing

### Get User Repositories

- **Endpoint**: `GET /api/v1/github/repos`
- **Authentication**: Session-based
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
- **Response**: Paginated list of connected repositories
- **Prerequisites**: User must have an active GitHub connection

## Configuration

The module uses the following environment variables:

| Variable          | Description              | Default         |
| ----------------- | ------------------------ | --------------- |
| `GITHUB_APP_NAME` | GitHub App name          | "shobapp24"     |
| `GITHUB_SECRET`   | Webhook secret           | "GitHub_secret" |
| `MAX_LIMIT`       | Maximum pagination limit | 100             |

## Webhook Events

The webhook endpoint accepts all GitHub webhook event types, including:

- `push`
- `issues`
- `pull_request`
- `star`
- `watch`
- `fork`
- `create`
- `delete`
- `commit_comment`
- `issue_comment`
- `label`
- `repository`
- `installation`
- `workflow_job`
- `workflow_run`
- `pull_request_review`

## Security

### Signature Verification

Webhook payloads are verified using HMAC-SHA256:

- Signature header: `X-Hub-Signature-256`
- Secret: Configured via `GITHUB_SECRET` environment variable

### OAuth State Validation

- State tokens are stored in Redis with 10-minute expiry
- Tokens are validated against user session
- Invalid or expired states result in error

## Error Handling

- `400 Bad Request`: Invalid callback parameters, invalid webhook signature, invalid JSON
- `404 Not Found`: No GitHub connection found for user
- `500 Internal ServerError`: Configuration errors or processing failures

## Data Models

### GitHub Connection

- `id`: Unique identifier
- `userId`: Associated user
- `installationId`: GitHub App installation ID

### GitHub Repository

- `id`: Unique identifier
- `repoId`: GitHub repository ID
- `GithubConnectionsId`: Parent connection
