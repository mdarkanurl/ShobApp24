# Action Run Module

The Action Run module provides REST API endpoints for retrieving execution data of actions within workflows. It allows users to view the history of action executions and their detailed results.

## Overview

The module handles:

- Retrieving all action runs for a workflow (paginated)
- Retrieving a single action run by ID with full details

## Architecture

### Module Dependencies

```
ActionRunModule
├── PrismaModule (database access)
├── ActionRunService
└── ActionRunController
```

## API Endpoints

### Get All Action Runs by Workflow ID

- **Endpoint**: `GET /api/v1/action-run/:workflowId`
- **Rate Limit**: 30 requests per 60 seconds
- **Authentication**: Session-based (user ID from req.session)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
- **Response**:

```typescript
{
  success: boolean;
  message: string;
  data: {
    data: ActionRun[];
    pagination: {
      totalItems: number;
      currentPage: number;
      totalPages: number;
      pageSize: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    }
  };
  error: null;
}
```

- **Notes**:
  - Results are ordered by `startedAt` descending (newest first)
  - Sensitive fields (input, output, error) are excluded from the list response
  - The workflow must belong to the authenticated user

### Get One Action Run by ID

- **Endpoint**: `GET /api/v1/action-run/one/:id`
- **Rate Limit**: 30 requests per 60 seconds
- **Authentication**: Session-based
- **Response**:

```typescript
{
  success: boolean;
  message: string;
  data: ActionRun;
  error: null;
}
```

- **Notes**:
  - Returns full action run details including input, output, and error
  - Includes related action and workflow run information
  - Validates user ownership through the workflow relationship

## Data Models

### ActionRun (List Response)

```typescript
{
  id: string;
  status: string;
  name: string;
  actionId: string;
  startedAt: Date;
  finishedAt: Date;
  // input, output, error are excluded
}
```

### ActionRun (Detail Response)

```typescript
{
  id: string;
  status: string;
  name: string;
  input: JSON;
  output: JSON;
  error: string | null;
  actionId: string;
  workflowRunId: string;
  startedAt: Date;
  finishedAt: Date;
  action: Action;
  workflowRun: {
    id: string;
    status: string;
    startedAt: Date;
    finishedAt: Date;
  }
}
```

## Error Handling

- `404 Not Found`: Workflow or action run not found
- `400 Bad Request`: Invalid limit value (exceeds MAX_LIMIT)
- `500 Internal Server Error`: Database or server errors

## Rate Limiting

All endpoints are protected with rate limiting:

- Get all: 30 requests/60s
- Get one: 30 requests/60s
